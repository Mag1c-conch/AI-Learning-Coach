from datetime import datetime

from flask import Blueprint, abort, jsonify, request

from ..extensions import db
from ..models import Assignment, Course, User, UserRole

bp = Blueprint("assignment", __name__, url_prefix="/assignments")


@bp.route("", methods=["GET"])
def list_assignments():
    """
    Optional query parameters:
    - course_id: int, filter assignments by course
    Returns 200 with an array of assignment JSON objects.
    """
    course_id = request.args.get("course_id", type=int)

    query = Assignment.query
    if course_id is not None:
        Course.query.get_or_404(course_id)
        query = query.filter_by(course_id=course_id)

    assignments = query.order_by(Assignment.due_date.asc()).all()
    return jsonify([assignment.to_dict() for assignment in assignments]), 200


@bp.route("", methods=["POST"])
def create_assignment():
    data = request.get_json(silent=True) or {}

    course_id = data.get("course_id")
    title = data.get("title")
    description = data.get("description")
    due_date_raw = data.get("due_date")
    teacher_id = data.get("teacher_id")
    optional = data.get("optional", False)

    if not all([course_id, title, description, due_date_raw, teacher_id]):
        abort(400, description="missing required fields")

    course = Course.query.get_or_404(course_id)

    teacher = User.query.get_or_404(teacher_id)
    if teacher.role != UserRole.ADMIN:
        abort(403, description="only administrators may create assignments")

    try:
        due_date = datetime.fromisoformat(due_date_raw)
    except (TypeError, ValueError):
        abort(400, description="due_date must be ISO 8601 formatted datetime string")

    assignment = Assignment(
        title=title,
        description=description,
        teacher_id=teacher_id,
        due_date=due_date,
        optional=bool(optional),
        course_id=course.id,
    )
    try:
        db.session.add(assignment)
        db.session.commit()
        return jsonify(assignment.to_dict()), 201
    except Exception as exc:
        db.session.rollback()
        abort(500, description=str(exc))
