# app/routes/ai_assistant.py
import json
from datetime import datetime, time, timedelta
from typing import Dict, Optional

from flask import Blueprint, abort, current_app, jsonify, request
from app.models import Assignment, Course, Enrollment, Material, StudyPlan, SYDNEY_TZ, User, UserRole

from ..extensions import db
from ..services import chat_storage
from ..services.assistant import _load_material_text, process_assistant_request
from ..services.ai import generate_reply

bp = Blueprint("ai_assistant", __name__)

_PLAN_WINDOW_START = time(8, 0)
_PLAN_WINDOW_END = time(18, 0)
_DEFAULT_SESSION_MINUTES = 90
_STUDY_PLAN_PROMPT_TEMPLATE = (
    "You are an expert study coach. Using the JSON input, craft a personalised study plan.\n"
    "Create a schedule covering each day from {week_start} to {week_end} inclusive (local time).\n"
    "Requirements:\n"
    "- Schedule study blocks only between 08:00 and 18:00.\n"
    "- Every task must focus on a single material or assignment and include `course_id`; include `material_id` when one is provided, otherwise use null.\n"
    "- Provide concise titles and actionable descriptions.\n"
    "- Respect upcoming due dates and distribute the workload evenly.\n"
    "- Return strict JSON (no markdown) following this schema:\n"
    "{{\n"
    '  \"student_id\": <int>,\n'
    '  \"week_start\": \"YYYY-MM-DD\",\n'
    '  \"week_end\": \"YYYY-MM-DD\",\n'
    '  \"days\": [\n'
    "    {{\"date\": \"YYYY-MM-DD\", \"tasks\": [\n"
    "      {{\"title\": str, \"description\": str, \"course_id\": int, \"material_id\": int or null, \"start_time\": \"HH:MM\", \"end_time\": \"HH:MM\"}}\n"
    "    ]}}\n"
    "  ]\n"
    "}}\n"
    "If information is missing, make reasonable assumptions and still produce a full seven-day plan."
)


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


@bp.route("/assistant/conversations/<int:conversation_id>", methods=["DELETE"])
def delete_conversation_route(conversation_id: int):
    """
    Delete the specified conversation and all of its messages.
    Requires a user_id query parameter to validate ownership.
    """
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    success = chat_storage.delete_conversation(conversation_id, user_id)
    if not success:
        return jsonify({"error": "conversation not found or access denied"}), 404

    return jsonify({"message": "conversation deleted successfully"}), 200


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
        "Use concise English for all text values. "
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

# generate study plan for a student
@bp.route("/get_plan", methods=["POST"])
def get_plan():
    payload = request.get_json(silent=True) or {}
    student_id = payload.get("student_id")
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
    course_ids = [course.id for course in courses]

    materials = []
    if course_ids:
        materials = (
            db.session.query(Material)
            .filter(Material.course_id.in_(course_ids))
            .order_by(Material.week_number.asc(), Material.uploaded_at.asc())
            .all()
        )

    assignments = []
    if course_ids:
        assignments = (
            db.session.query(Assignment)
            .filter(Assignment.course_id.in_(course_ids))
            .order_by(Assignment.due_date.asc())
            .all()
        )

    week_start, week_end = _determine_week_window()
    plan_context = _build_plan_context(student, courses, assignments, materials, week_start, week_end)
    messages = [{"role": "user", "content": json.dumps(plan_context, ensure_ascii=False)}]
    system_prompt = _build_study_plan_prompt(week_start, week_end)

    plan_payload: Optional[dict] = None
    plan_source = "ai"
    try:
        reply = generate_reply(
            messages,
            system_prompt=system_prompt,
            temperature=0.2,
            max_output_tokens=2048,
        )
        plan_payload = _parse_json_reply(reply)
    except ValueError as err:
        abort(400, description=str(err))
    except RuntimeError as err:
        current_app.logger.exception("Failed to call Gemini for study plan: %s", err)
        plan_payload = None

    if plan_payload is None:
        plan_source = "fallback"
        current_app.logger.warning("Using fallback study plan generation for student_id=%s", student_id)
        plan_payload = _build_fallback_plan(student, courses, materials, week_start, week_end)

    normalized_plan = _normalize_plan_payload(
        plan_payload,
        student_id=student.id,
        week_start=week_start,
        week_end=week_end,
        course_ids=course_ids,
        material_ids=[material.id for material in materials],
    )

    if not any(day.get("tasks") for day in normalized_plan.get("days", [])):
        plan_source = "fallback"
        fallback_payload = _build_fallback_plan(student, courses, materials, week_start, week_end)
        normalized_plan = _normalize_plan_payload(
            fallback_payload,
            student_id=student.id,
            week_start=week_start,
            week_end=week_end,
            course_ids=course_ids,
            material_ids=[material.id for material in materials],
        )

    metadata = normalized_plan.setdefault("metadata", {})
    metadata["source"] = plan_source
    metadata["generated_at"] = datetime.now(SYDNEY_TZ).isoformat()

    plan_record = (
        StudyPlan.query.filter_by(student_id=student.id, week_start=week_start).one_or_none()
    )
    if plan_record:
        plan_record.week_end = week_end
        plan_record.plan = normalized_plan
    else:
        plan_record = StudyPlan(
            student_id=student.id,
            week_start=week_start,
            week_end=week_end,
        )
        plan_record.plan = normalized_plan
        db.session.add(plan_record)

    db.session.commit()
    return jsonify(plan_record.to_dict()), 200

# get study plan for a student
@bp.route("/assistant/study_plan/<int:student_id>", methods=["GET"])
def retrieve_study_plan(student_id: int):
    query = StudyPlan.query.filter_by(student_id=student_id)
    week_start_param = request.args.get("week_start")
    if week_start_param:
        try:
            week_start_date = datetime.strptime(week_start_param, "%Y-%m-%d").date()
        except ValueError:
            abort(400, description="week_start must follow YYYY-MM-DD format")
        query = query.filter(StudyPlan.week_start == week_start_date)

    plan = query.order_by(StudyPlan.week_start.desc(), StudyPlan.updated_at.desc()).first()
    if not plan:
        abort(404, description="study plan not found")
    return jsonify(plan.to_dict()), 200


def _determine_week_window():
    today = datetime.now(SYDNEY_TZ).date()
    week_start = today + timedelta(days=1)
    week_end = week_start + timedelta(days=6)
    return week_start, week_end


def _build_study_plan_prompt(week_start, week_end):
    return _STUDY_PLAN_PROMPT_TEMPLATE.format(
        week_start=week_start.isoformat(),
        week_end=week_end.isoformat(),
    )


def _build_plan_context(student, courses, assignments, materials, week_start, week_end):
    course_context: Dict[int, Dict[str, object]] = {}
    for course in courses:
        course_context[course.id] = {
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "description": course.description,
            "assignments": [],
            "materials": [],
        }

    for assignment in assignments:
        entry = course_context.get(assignment.course_id)
        if not entry:
            continue
        if len(entry["assignments"]) >= 10:
            continue
        entry["assignments"].append(_summarize_assignment(assignment))

    materials_per_course: Dict[int, int] = {}
    for material in materials:
        entry = course_context.get(material.course_id)
        if not entry:
            continue
        count = materials_per_course.get(material.course_id, 0)
        if count >= 8:
            continue
        entry["materials"].append(_summarize_material(material))
        materials_per_course[material.course_id] = count + 1

    return {
        "student": {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
        },
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "courses": list(course_context.values()),
        "stats": {
            "course_count": len(courses),
            "assignment_count": len(assignments),
            "material_count": len(materials),
        },
    }


def _summarize_assignment(assignment):
    return {
        "id": assignment.id,
        "course_id": assignment.course_id,
        "title": assignment.title,
        "description": assignment.description,
        "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
        "optional": assignment.optional,
    }


def _summarize_material(material, preview_limit: int = 600):
    summary = {
        "id": material.id,
        "course_id": material.course_id,
        "title": material.original_name,
        "file_type": material.file_type,
        "week_number": material.week_number,
        "uploaded_at": material.uploaded_at.isoformat() if material.uploaded_at else None,
    }
    try:
        preview = _load_material_text(material, limit=preview_limit)
    except Exception as exc:  # noqa: BLE001 - best effort preview
        current_app.logger.debug("Unable to extract preview for material %s: %s", material.id, exc)
    else:
        if preview:
            summary["preview"] = preview
    return summary


def _normalize_plan_payload(payload, student_id, week_start, week_end, course_ids, material_ids):
    course_set = set(course_ids or [])
    material_set = set(material_ids or [])
    allowed_dates = [
        (week_start + timedelta(days=offset)).isoformat() for offset in range((week_end - week_start).days + 1)
    ]
    allowed_date_set = set(allowed_dates)

    normalized = {
        "student_id": student_id,
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "days": [],
    }

    raw_days = payload.get("days") if isinstance(payload, dict) else None
    if not isinstance(raw_days, list):
        raw_days = []

    day_map: Dict[str, Dict[str, object]] = {}
    for raw_day in raw_days:
        if not isinstance(raw_day, dict):
            continue
        date_value = raw_day.get("date")
        if not isinstance(date_value, str) or date_value not in allowed_date_set:
            continue
        raw_tasks = raw_day.get("tasks") if isinstance(raw_day.get("tasks"), list) else []
        normalized_tasks = []
        for task in raw_tasks:
            normalized_task = _normalize_task(task, course_ids, course_set, material_set)
            if normalized_task:
                normalized_tasks.append(normalized_task)
        day_map[date_value] = {"date": date_value, "tasks": normalized_tasks}

    for date_str in allowed_dates:
        normalized["days"].append(day_map.get(date_str, {"date": date_str, "tasks": []}))

    return normalized


def _normalize_task(task, course_ids, course_set, material_set):
    if not isinstance(task, dict):
        return None

    title = task.get("title") or "Study Session"
    description = task.get("description") or ""

    course_id = task.get("course_id")
    try:
        course_id_int = int(course_id)
    except (TypeError, ValueError):
        course_id_int = course_ids[0] if course_ids else None
    else:
        if course_id_int not in course_set:
            course_id_int = course_ids[0] if course_ids else None

    material_id = task.get("material_id")
    try:
        material_id_int = int(material_id)
    except (TypeError, ValueError):
        material_id_int = None
    else:
        if material_id_int not in material_set:
            material_id_int = None

    start_time = _parse_time_value(task.get("start_time")) or time(9, 0)
    start_time = max(start_time, _PLAN_WINDOW_START)
    end_time = _parse_time_value(task.get("end_time")) or _add_minutes(start_time, _DEFAULT_SESSION_MINUTES)
    end_time = min(end_time, _PLAN_WINDOW_END)

    if end_time <= start_time:
        adjusted = _add_minutes(start_time, 60)
        if adjusted > _PLAN_WINDOW_END:
            return None
        end_time = adjusted

    return {
        "title": str(title),
        "description": str(description),
        "course_id": course_id_int,
        "material_id": material_id_int,
        "start_time": start_time.strftime("%H:%M"),
        "end_time": end_time.strftime("%H:%M"),
    }


def _parse_time_value(value: Optional[str]):
    if isinstance(value, time):
        return value
    if isinstance(value, str):
        try:
            return datetime.strptime(value.strip(), "%H:%M").time()
        except ValueError:
            return None
    return None


def _add_minutes(start_time: time, minutes: int):
    baseline = datetime.combine(datetime.now(SYDNEY_TZ).date(), start_time)
    baseline += timedelta(minutes=minutes)
    return baseline.time()


def _build_fallback_plan(student, courses, materials, week_start, week_end):
    day_dates = [week_start + timedelta(days=offset) for offset in range((week_end - week_start).days + 1)]
    plan = {
        "student_id": student.id,
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "days": [{"date": day.isoformat(), "tasks": []} for day in day_dates],
    }

    course_lookup = {course.id: course for course in courses}
    slots = [("09:00", "10:30"), ("10:45", "12:15"), ("13:30", "15:00"), ("15:15", "16:45")]
    max_tasks = len(plan["days"]) * len(slots)

    if materials:
        for index, material in enumerate(materials[:max_tasks]):
            day_entry = plan["days"][index % len(plan["days"])]
            slot = slots[index % len(slots)]
            course = course_lookup.get(material.course_id)
            course_name = f"{course.name} - " if course else ""
            task_title = f"{course_name}{material.original_name}"
            day_entry["tasks"].append(
                {
                    "title": task_title,
                    "description": "Review the material and capture key takeaways.",
                    "course_id": material.course_id,
                    "material_id": material.id,
                    "start_time": slot[0],
                    "end_time": slot[1],
                }
            )
    else:
        default_course_id = courses[0].id if courses else None
        generic_slots = [("09:00", "11:00"), ("14:00", "16:00")]
        for idx, day_entry in enumerate(plan["days"]):
            slot = generic_slots[idx % len(generic_slots)]
            day_entry["tasks"].append(
                {
                    "title": "Independent Study",
                    "description": "Use this block to revise course content or explore supplementary materials.",
                    "course_id": default_course_id,
                    "material_id": None,
                    "start_time": slot[0],
                    "end_time": slot[1],
                }
            )

    return plan
