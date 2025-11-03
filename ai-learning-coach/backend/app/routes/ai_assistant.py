# app/routes/ai_assistant.py
from flask import Blueprint, abort, current_app, jsonify, request
from app.models import Assignment, Course, Enrollment, User, UserRole

from ..extensions import db
from ..services import chat_storage
from ..services.assistant import process_assistant_request
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

