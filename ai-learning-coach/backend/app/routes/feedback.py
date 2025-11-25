from flask import Blueprint, abort, jsonify, request
from datetime import datetime, timezone

from ..extensions import db
from ..models import Course, Feedback, User, UserRole

bp = Blueprint("feedback", __name__, url_prefix="/feedback")


@bp.route("", methods=["POST"])
def create_feedback():

    data = request.get_json(silent=True)
    if data is None:
        abort(400, description="request payload must be valid JSON")

    teacher_raw = data.get("teacher_id")
    student_raw = data.get("student_id")
    course_raw = data.get("course_id")

    if teacher_raw is None or student_raw is None:
        abort(400, description="teacher_id and student_id are required")

    try:
        teacher_id = int(teacher_raw)
        student_id = int(student_raw)
    except (TypeError, ValueError):
        abort(400, description="teacher_id and student_id must be integers")

    if course_raw is None:
        course_id = None
    else:
        try:
            course_id = int(course_raw)
        except (TypeError, ValueError):
            abort(400, description="course_id must be an integer")
    content_raw = data.get("content")

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
    raw_include = request.args.get("include_related")
    if raw_include is None:
        include_related = True
    elif isinstance(raw_include, bool):
        include_related = raw_include
    else:
        val = str(raw_include).strip().lower()
        include_related = val in {"1", "true", "yes", "y", "on"}
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

    data = request.get_json(silent=True)
    if data is None:
        abort(400, description="request payload must be valid JSON")

    student_raw = data.get("student_id")
    if student_raw is None:
        abort(400, description="student_id is required")
    try:
        student_id = int(student_raw)
    except (TypeError, ValueError):
        abort(400, description="student_id must be an integer")

    is_read_raw = data.get("is_read")
    if is_read_raw is None:
        is_read = True
    elif isinstance(is_read_raw, bool):
        is_read = is_read_raw
    else:
        val = str(is_read_raw).strip().lower()
        if val in {"1", "true", "yes", "y", "on"}:
            is_read = True
        elif val in {"0", "false", "no", "n", "off"}:
            is_read = False
        else:
            is_read = True
    
    feedback = Feedback.query.get_or_404(feedback_id)
    
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
    
    # check ownership
    if feedback.student_id != student_id:
        abort(403, description="you can only delete your own feedback")
    
    db.session.delete(feedback)
    db.session.commit()
    
    return jsonify({"message": "feedback deleted successfully"}), 200
