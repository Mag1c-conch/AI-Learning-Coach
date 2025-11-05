from datetime import datetime

from flask import Blueprint, abort, jsonify, request

from ..extensions import db
from ..models import Assignment, AssignmentGrade, Course, Enrollment, User, UserRole

bp = Blueprint("assignment", __name__, url_prefix="/assignments")


def _require_json() -> dict:
    payload = request.get_json(silent=True)
    if payload is None:
        abort(400, description="request payload must be valid JSON")
    return payload


def _parse_bool(value, default=None):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def _coerce_float(field: str, value):
    if value is None:
        abort(400, description=f"{field} is required")
    try:
        return float(value)
    except (TypeError, ValueError):
        abort(400, description=f"{field} must be a number")


def _coerce_int(field: str, value):
    if value is None:
        abort(400, description=f"{field} is required")
    try:
        return int(value)
    except (TypeError, ValueError):
        abort(400, description=f"{field} must be an integer")


def _ensure_student_enrolled(course_id: int, student_id: int) -> None:
    if not Enrollment.query.filter_by(course_id=course_id, user_id=student_id).first():
        abort(403, description="student is not enrolled in this course")


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


@bp.route("/<int:assignment_id>/grades", methods=["POST"])
def upsert_assignment_grade(assignment_id: int):
    """
    Creates or updates a grade for a student's assignment submission.
    Expects JSON body with fields:
    - teacher_id: int, id of the teacher grading (must own the assignment)
    - student_id: int, id of the student being graded
    - score: float, numeric grade value
    - comment: optional text feedback
    Returns 201 for new grade records and 200 for updates.
    """
    assignment = Assignment.query.get_or_404(assignment_id)

    payload = _require_json()

    teacher_id = _coerce_int("teacher_id", payload.get("teacher_id"))
    student_id = _coerce_int("student_id", payload.get("student_id"))
    score = _coerce_float("score", payload.get("score"))
    comment_raw = payload.get("comment")
    comment = str(comment_raw).strip() if comment_raw is not None else None
    if comment == "":
        comment = None

    teacher = User.query.get_or_404(teacher_id)
    if teacher.role != UserRole.ADMIN:
        abort(403, description="only teachers may grade assignments")
    if teacher.id != assignment.teacher_id:
        abort(403, description="teacher does not own this assignment")

    student = User.query.get_or_404(student_id)
    if student.role != UserRole.STUDENT:
        abort(403, description="grades may only be recorded for students")

    _ensure_student_enrolled(assignment.course_id, student.id)

    grade = AssignmentGrade.query.filter_by(
        assignment_id=assignment.id,
        student_id=student.id,
    ).first()

    created = False
    if grade is None:
        grade = AssignmentGrade(
            assignment_id=assignment.id,
            student_id=student.id,
        )
        created = True

    grade.score = score
    grade.comment = comment
    grade.graded_by = teacher.id

    try:
        db.session.add(grade)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        abort(500, description=str(exc))

    status_code = 201 if created else 200
    return jsonify(grade.to_dict(include_related=True)), status_code


@bp.route("/<int:assignment_id>/grades", methods=["GET"])
def list_assignment_grades(assignment_id: int):
    """
    Lists grades for an assignment.
    Query parameters:
    - viewer_id: required int, id of the user requesting the grades.
        * If teacher (admin) who owns the assignment, all grades are returned.
        * If student, only their grade is returned.
    - student_id: optional int, further filters grades (teachers only).
    - include_related: optional bool, include related user information (default true).
    """
    assignment = Assignment.query.get_or_404(assignment_id)

    viewer_id = request.args.get("viewer_id", type=int)
    if not viewer_id:
        abort(400, description="viewer_id is required")

    viewer = User.query.get_or_404(viewer_id)
    include_related = _parse_bool(request.args.get("include_related"), default=True)

    query = AssignmentGrade.query.filter_by(assignment_id=assignment.id)

    if viewer.role == UserRole.STUDENT:
        if viewer.id != viewer_id:
            abort(403, description="students may only view their own grades")
        _ensure_student_enrolled(assignment.course_id, viewer.id)
        query = query.filter_by(student_id=viewer.id)
    elif viewer.role == UserRole.ADMIN:
        if viewer.id != assignment.teacher_id:
            abort(403, description="only the assignment owner may view grades for all students")
        student_filter = request.args.get("student_id", type=int)
        if student_filter:
            query = query.filter_by(student_id=student_filter)
    else:
        abort(403, description="unsupported user role")

    grades = query.order_by(AssignmentGrade.graded_at.desc()).all()
    return jsonify([grade.to_dict(include_related=include_related) for grade in grades]), 200
