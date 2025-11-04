from datetime import datetime, timezone

from flask import Blueprint, abort, jsonify, request

from ..extensions import db
from ..models import (
    Assignment,
    Course,
    Enrollment,
    FeedbackNotification,
    Material,
    User,
    UserRole,
)

bp = Blueprint("feedback", __name__, url_prefix="/feedback")


def _require_json() -> dict:
    payload = request.get_json(silent=True)
    if payload is None:
        abort(400, description="request payload must be valid JSON")
    return payload


def _parse_bool(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "y", "on"}:
        return True
    if text in {"0", "false", "no", "n", "off"}:
        return False
    return None


def _coerce_int(field_name: str, value):
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        abort(400, description=f"{field_name} must be an integer")


def _ensure_student_enrolled(course_id: int, student_id: int) -> None:
    if not Enrollment.query.filter_by(course_id=course_id, user_id=student_id).first():
        abort(403, description="student is not enrolled in this course")


def _ensure_teacher_role(user: User) -> None:
    if user.role != UserRole.ADMIN:
        abort(403, description="only teachers may send feedback")


@bp.route("", methods=["POST"])
def create_feedback_notification():
    data = _require_json()

    course_id = _coerce_int("course_id", data.get("course_id"))
    teacher_id = _coerce_int("teacher_id", data.get("teacher_id"))
    student_id = _coerce_int("student_id", data.get("student_id"))
    content = data.get("content")

    if not course_id or not teacher_id or not student_id or content is None:
        abort(400, description="course_id, teacher_id, student_id, and content are required")

    course = Course.query.get_or_404(course_id)
    teacher = User.query.get_or_404(teacher_id)
    student = User.query.get_or_404(student_id)

    _ensure_teacher_role(teacher)
    if course.created_by != teacher.id:
        abort(403, description="teacher does not own the specified course")
    if student.role != UserRole.STUDENT:
        abort(403, description="feedback may only be sent to students")

    _ensure_student_enrolled(course.id, student.id)

    assignment_id = _coerce_int("assignment_id", data.get("assignment_id"))
    submission_id = _coerce_int("submission_id", data.get("submission_id"))
    title = data.get("title")

    assignment = None
    if assignment_id:
        assignment = Assignment.query.get_or_404(assignment_id)
        if assignment.course_id != course.id:
            abort(400, description="assignment_id does not belong to the specified course")
        if assignment.teacher_id != teacher.id:
            abort(403, description="only the owning teacher may send assignment feedback")

    submission = None
    if submission_id:
        submission = Material.query.get_or_404(submission_id)
        if submission.course_id != course.id:
            abort(400, description="submission does not belong to the specified course")
        if submission.uploaded_by != student.id:
            abort(403, description="submission does not belong to the specified student")
        if assignment and submission.assignment_id != assignment.id:
            abort(400, description="submission is not linked to the specified assignment")
        if not assignment and submission.assignment_id:
            assignment = submission.assignment
            assignment_id = submission.assignment_id
        # Mark submission materials explicitly as student uploads
        if submission.file_type != "assignment_submission":
            submission.file_type = submission.file_type or "assignment_submission"

    sanitized_title = title.strip() if isinstance(title, str) else None
    sanitized_content = str(content).strip()
    if not sanitized_content:
        abort(400, description="content must not be empty")

    notification = FeedbackNotification(
        course_id=course.id,
        assignment_id=assignment_id,
        submission_id=submission.id if submission else None,
        teacher_id=teacher.id,
        student_id=student.id,
        title=sanitized_title,
        content=sanitized_content,
    )

    db.session.add(notification)
    db.session.commit()

    return jsonify(notification.to_dict(include_related=True)), 201


@bp.route("", methods=["GET"])
def list_feedback_notifications():
    query = FeedbackNotification.query

    course_id = request.args.get("course_id", type=int)
    assignment_id = request.args.get("assignment_id", type=int)
    submission_id = request.args.get("submission_id", type=int)
    teacher_id = request.args.get("teacher_id", type=int)
    student_id = request.args.get("student_id", type=int)
    is_read_param = request.args.get("is_read")
    include_related = request.args.get("include_related")

    if course_id:
        query = query.filter(FeedbackNotification.course_id == course_id)
    if assignment_id:
        query = query.filter(FeedbackNotification.assignment_id == assignment_id)
    if submission_id:
        query = query.filter(FeedbackNotification.submission_id == submission_id)
    if teacher_id:
        query = query.filter(FeedbackNotification.teacher_id == teacher_id)
    if student_id:
        query = query.filter(FeedbackNotification.student_id == student_id)

    if is_read_param is not None:
        parsed = _parse_bool(is_read_param)
        if parsed is None:
            abort(400, description="is_read must be a boolean value")
        query = query.filter(FeedbackNotification.is_read == parsed)

    include_rel = _parse_bool(include_related)
    include_rel = True if include_rel is None else include_rel

    notifications = query.order_by(FeedbackNotification.created_at.desc()).all()
    return jsonify([n.to_dict(include_related=include_rel) for n in notifications]), 200


@bp.route("/<int:notification_id>/read", methods=["PATCH"])
def update_feedback_read_status(notification_id: int):
    payload = _require_json()
    notification = FeedbackNotification.query.get_or_404(notification_id)

    student_id = _coerce_int("student_id", payload.get("student_id"))
    if not student_id:
        abort(400, description="student_id is required to update read status")
    if notification.student_id != student_id:
        abort(403, description="student_id does not match the notification recipient")

    desired = payload.get("is_read")
    parsed = _parse_bool(desired) if desired is not None else True
    if parsed is None:
        abort(400, description="is_read must be a boolean value")

    notification.is_read = parsed
    notification.read_at = datetime.now(timezone.utc) if parsed else None

    db.session.commit()
    return jsonify(notification.to_dict(include_related=True)), 200
