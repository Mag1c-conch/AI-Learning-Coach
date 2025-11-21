from flask import Blueprint, abort, jsonify, request
from datetime import datetime, timezone

from ..extensions import db
from ..models import Course, Feedback, User, UserRole

bp = Blueprint("feedback", __name__, url_prefix="/feedback")


def _require_json() -> dict:
    payload = request.get_json(silent=True)
    if payload is None:
        abort(400, description="request payload must be valid JSON")
    return payload


def _coerce_int(field: str, value, required: bool = True):
    if value is None:
        if required:
            abort(400, description=f"{field} is required")
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        abort(400, description=f"{field} must be an integer")


def _parse_bool(value, default=None):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    txt = str(value).strip().lower()
    if txt in {"1", "true", "yes", "y", "on"}:
        return True
    if txt in {"0", "false", "no", "n", "off"}:
        return False
    return default


@bp.route("", methods=["POST"])
def create_feedback():

    payload = _require_json()

    teacher_id = _coerce_int("teacher_id", payload.get("teacher_id"))
    student_id = _coerce_int("student_id", payload.get("student_id"))
    course_id = _coerce_int("course_id", payload.get("course_id"), required=False)
    content_raw = payload.get("content")

    content = str(content_raw).strip() if content_raw is not None else ""
    if not content:
        abort(400, description="content must not be empty")

    teacher = User.query.get_or_404(teacher_id)
    if teacher.role != UserRole.ADMIN:
        abort(403, description="only teachers may send feedback")

    student = User.query.get_or_404(student_id)
    if student.role != UserRole.STUDENT:
        abort(403, description="feedback may only be sent to students")

    course = None
    if course_id is not None:
        course = Course.query.get_or_404(course_id)
        if course.created_by != teacher.id:
            abort(403, description="teacher does not own the specified course")

    feedback = Feedback(
        teacher_id=teacher.id,
        student_id=student.id,
        course_id=course.id if course else None,
        content=content,
    )
    db.session.add(feedback)
    db.session.commit()

    return jsonify(feedback.to_dict(include_related=True)), 201


@bp.route("", methods=["GET"])
def list_feedback():

    query = Feedback.query

    teacher_id = request.args.get("teacher_id", type=int)
    student_id = request.args.get("student_id", type=int)
    course_id = request.args.get("course_id", type=int)
    include_related = _parse_bool(request.args.get("include_related"), default=True)
    limit = request.args.get("limit", type=int)

    if teacher_id:
        query = query.filter(Feedback.teacher_id == teacher_id)
    if student_id:
        query = query.filter(Feedback.student_id == student_id)
    if course_id:
        query = query.filter(Feedback.course_id == course_id)

    if not any([teacher_id, student_id, course_id]):
        abort(400, description="at least one of teacher_id, student_id, or course_id must be provided")

    query = query.order_by(Feedback.created_at.desc())
    if limit is not None:
        query = query.limit(max(1, limit))

    entries = query.all()
    return jsonify([entry.to_dict(include_related=include_related) for entry in entries]), 200


@bp.route("/<int:feedback_id>/read", methods=["PATCH"])
def mark_feedback_read(feedback_id):

    payload = _require_json()
    
    student_id = _coerce_int("student_id", payload.get("student_id"))
    is_read = _parse_bool(payload.get("is_read"), default=True)
    
    feedback = Feedback.query.get_or_404(feedback_id)
    
    # Ensure only the recipient student can update the read status
    if feedback.student_id != student_id:
        abort(403, description="you can only mark your own feedback as read")
    
    feedback.is_read = is_read
    if is_read and not feedback.read_at:
        feedback.read_at = datetime.now(timezone.utc)
    elif not is_read:
        feedback.read_at = None
    
    db.session.commit()
    
    return jsonify(feedback.to_dict(include_related=True)), 200


@bp.route("/<int:feedback_id>", methods=["DELETE"])
def delete_feedback(feedback_id):

    student_id = request.args.get("student_id", type=int)
    if not student_id:
        abort(400, description="student_id is required")
    
    feedback = Feedback.query.get_or_404(feedback_id)
    
    # Ensure only the recipient student can delete the feedback
    if feedback.student_id != student_id:
        abort(403, description="you can only delete your own feedback")
    
    db.session.delete(feedback)
    db.session.commit()
    
    return jsonify({"message": "feedback deleted successfully"}), 200
