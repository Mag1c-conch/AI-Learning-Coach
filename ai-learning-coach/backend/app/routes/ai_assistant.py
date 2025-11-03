# app/routes/ai_assistant.py
import json

from flask import Blueprint, abort, current_app, jsonify, request
from app.models import Assignment, Course, Enrollment, Material, User, UserRole

from ..extensions import db
from ..services import chat_storage
from ..services.assistant import _load_material_text, process_assistant_request
from ..services.ai import generate_reply

bp = Blueprint("ai_assistant", __name__)


@bp.route("/assistant/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json(force=True, silent=True) or {}
    current_app.logger.debug("AI assistant payload: %s", data)
    try:
        messages = data.get("messages", []) or []
        conversation_id = data.get("conversation_id")
        user_id = data.get("user_id")
        conversation_title = data.get("conversation_title")

        if conversation_id:
            conversation = chat_storage.get_conversation(conversation_id)
            if not conversation:
                return jsonify({"error": "conversation not found"}), 404
            if conversation.user_id and user_id and conversation.user_id != user_id:
                return jsonify({"error": "forbidden"}), 403
        else:
            conversation = chat_storage.create_conversation(
                user_id=user_id,
                title=conversation_title,
            )
            conversation_id = conversation.id

        history = chat_storage.get_history(conversation_id)
        prompt_messages = list(history)

        latest_user_message = None
        if messages:
            latest_user_message = messages[-1]
            role = latest_user_message.get("role")
            content = latest_user_message.get("content")
            if role != "user" or not content:
                raise ValueError("latest message must be from user with non-empty content")
            chat_storage.append_message(conversation_id, role, content)
            prompt_messages.append({"role": role, "content": content})

        result = process_assistant_request(prompt_messages)
        reply_text = result.get("text")

        if reply_text:
            chat_storage.append_message(conversation_id, "model", reply_text)

        result["conversation_id"] = conversation_id
        result["messages"] = chat_storage.get_history(conversation_id)

        return jsonify(result), 200
    except Exception as exc:
        current_app.logger.exception("ERROR in /assistant/chat: %s", exc)
        return jsonify({"error": str(exc)}), 500


@bp.route("/assistant/conversations", methods=["GET"])
def list_conversations():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    limit = request.args.get("limit", type=int)
    include_messages = request.args.get("include_messages", "false").lower() in {"true", "1", "yes"}
    message_limit = request.args.get("message_limit", type=int)

    conversations = chat_storage.list_conversations(
        user_id=user_id,
        limit=limit,
        include_messages=include_messages,
        message_limit=message_limit,
    )
    return jsonify(conversations), 200


@bp.route("/assistant/conversations/<int:conversation_id>", methods=["GET"])
def get_conversation(conversation_id: int):
    user_id = request.args.get("user_id", type=int)
    message_limit = request.args.get("message_limit", type=int)

    data = chat_storage.get_conversation_with_history(conversation_id, message_limit=message_limit)
    if not data:
        return jsonify({"error": "conversation not found"}), 404

    conv_user_id = data.get("user_id")
    if conv_user_id and user_id is None:
        return jsonify({"error": "user_id is required"}), 400
    if conv_user_id and user_id != conv_user_id:
        return jsonify({"error": "forbidden"}), 403

    return jsonify(data), 200


def _parse_json_reply(text: str):
    if not text:
        return None
    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = candidate[3:]
        candidate = candidate.lstrip()
        if candidate.lower().startswith("json"):
            candidate = candidate[4:]
        candidate = candidate.lstrip("\n")
        candidate = candidate.rsplit("```", 1)[0]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None


@bp.route("/assistant/grade_submission", methods=["POST"])
def grade_submission():
    payload = request.get_json(silent=True) or {}

    material_id_raw = payload.get("material_id")
    teacher_id_raw = payload.get("teacher_id")
    rubric = payload.get("rubric")
    additional_instructions = payload.get("instructions")
    max_score_raw = payload.get("max_score", 100)

    try:
        material_id = int(material_id_raw)
    except (TypeError, ValueError):
        abort(400, description="material_id must be an integer")

    try:
        teacher_id = int(teacher_id_raw)
    except (TypeError, ValueError):
        abort(400, description="teacher_id must be an integer")

    try:
        max_score = int(max_score_raw)
    except (TypeError, ValueError):
        abort(400, description="max_score must be an integer")

    if max_score <= 0:
        abort(400, description="max_score must be a positive integer")

    teacher = User.query.get_or_404(teacher_id)
    if teacher.role != UserRole.ADMIN:
        abort(403, description="only administrators may grade submissions")

    material = Material.query.get_or_404(material_id)
    if material.assignment_id is None:
        abort(400, description="material is not an assignment submission")

    assignment = material.assignment or Assignment.query.get_or_404(material.assignment_id)
    if assignment.teacher_id != teacher.id:
        abort(403, description="only the assignment owner may grade this submission")

    course = assignment.course or Course.query.get(assignment.course_id)
    student = User.query.get(material.uploaded_by)

    try:
        submission_text = _load_material_text(material, limit=4000)
    except FileNotFoundError:
        abort(404, description="submission file not found on server")
    except ValueError as exc:
        abort(422, description=str(exc))

    if not submission_text.strip():
        abort(422, description="submission file is empty or unreadable")

    course_info = f"{course.name} ({course.code})" if course else f"Course ID {assignment.course_id}"
    student_name = f"{student.first_name} {student.last_name}".strip() if student else "Unknown student"

    context_parts = [
        f"Course: {course_info}",
        f"Assignment title: {assignment.title}",
        f"Assignment description: {assignment.description or 'No description provided'}",
        f"Due date: {assignment.due_date.isoformat() if assignment.due_date else 'Not set'}",
        f"Student: {student_name} (ID {material.uploaded_by})",
        f"Maximum score: {max_score}",
    ]
    if rubric:
        context_parts.append(f"Rubric or grading criteria:\n{rubric}")
    if additional_instructions:
        context_parts.append(f"Additional teacher instructions:\n{additional_instructions}")

    grading_context = "\n".join(context_parts)
    submission_block = f"Student submission (truncated to 4000 chars):\n{submission_text}"

    user_message = f"{grading_context}\n\n{submission_block}"

    system_prompt = (
        "You are an experienced instructor grading a student's assignment submission. "
        "Analyze the assignment details and the student's work. "
        "Respond with a strict JSON object (no extra commentary) matching this schema:\n"
        "{\n"
        '  "score": {"value": <number>, "max": ' + str(max_score) + ', "explanation": "<short summary>"},\n'
        '  "strengths": ["<positive observation>", ...],\n'
        '  "mistakes": [\n'
        '    {\n'
        '      "issue": "<concise description of the mistake>",\n'
        '      "hint": "<actionable guidance to correct it>",\n'
        '      "follow_up_question": {\n'
        '         "question": "<new practice question targeting the mistake>",\n'
        '         "answer": "<correct answer or outline>"\n'
        "      }\n"
        "    }\n"
        "  ],\n"
        '  "next_steps": "<overall advice for the student>"\n'
        "}\n"
        f"The numeric score must be between 0 and {max_score}. "
        "Provide at least one mistake entry when issues are found; if the work is excellent, return an empty list and explain why. "
        "Use concise Simplified Chinese for all text values. "
        "Do not include markdown or additional prose outside the JSON object."
    )

    messages = [{"role": "user", "content": user_message}]

    try:
        reply = generate_reply(messages, system_prompt=system_prompt, temperature=0.2)
    except ValueError as err:
        abort(400, description=str(err))
    except RuntimeError as err:
        abort(502, description=str(err))

    parsed = _parse_json_reply(reply)
    response_payload = {
        "grading": parsed,
        "raw_reply": reply,
        "model": current_app.config.get("GEMINI_MODEL", "gemini-1.5-flash"),
        "metadata": {
            "material_id": material.id,
            "assignment_id": assignment.id,
            "student_id": material.uploaded_by,
            "max_score": max_score,
        },
    }

    if parsed is None:
        response_payload["parse_error"] = "model response was not valid JSON"

    return jsonify(response_payload), 200
@bp.route("/get_plan", methods=["POST"])
def get_plan():
    payload = request.get_json(silent=True) or {}
    student_id=payload.get('student_id')
    # validate input
    if not student_id:
        abort(400, description="missing required fields")
    student = User.query.get_or_404(student_id)
    if student.role != UserRole.STUDENT:
        abort(403, description="only students may enroll in courses")
    courses = (
        db.session.query(Course)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.user_id == student_id)
        .order_by(Course.created_at.desc())
        .all()
    )
    course_info = ""
    for course in courses:
        course_info += f"Course Code:{course.code}\nCouse Name: {course.name}\nCourse Description: {course.description}\n"
        course_info += "Assignments\n\n"
        assignments = Assignment.query.filter_by(course_id=course.id).order_by(Assignment.due_date.asc()).all()
        for assignment in assignments:
            course_info += f"Assignment: {assignment.title}\nDescription:{assignment.description}\nDue Date{assignment.due_date}\n"
        
    messages = [{"role": "user", "content": course_info}]
    system_prompt = "You are an expert in study planning and I will give you the courses and assignments, you should generate an study plan for today."

    if not isinstance(messages, list) or not messages:
        abort(400, description="messages must be a non-empty list")

    try:
        reply = generate_reply(messages, system_prompt=system_prompt)
    except ValueError as err:
        abort(400, description=str(err))
    except RuntimeError as err:
        abort(502, description=str(err))

    return jsonify(
        {
            "reply": reply,
            "model": current_app.config.get("GEMINI_MODEL", "gemini-1.5-flash"),
        }
    ), 200