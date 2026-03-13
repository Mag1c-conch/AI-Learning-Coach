from datetime import datetime

from flask import Blueprint, abort, jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Assignment, AssignmentGrade, Course, Enrollment, User, UserRole
from ..auth_utils import resolve_user

bp = Blueprint("assignment", __name__, url_prefix="/assignments")


def ensure_student_enrolled(course_id, student_id):
    if not Enrollment.query.filter_by(course_id=course_id, user_id=student_id).first():
        abort(403, description="student is not enrolled in this course")


@bp.route("", methods=["GET"])
def list_assignments():
    """
    List assignments (optionally filter by course)
    ---
    tags:
      - Assignments
    parameters:
      - name: course_id
        in: query
        type: integer
        description: Filter by course ID
    responses:
      200:
        description: List of assignments
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              title:
                type: string
              description:
                type: string
              due_date:
                type: string
              course_id:
                type: integer
      404:
        description: Course not found (if course_id provided)
    """
    course_id = request.args.get("course_id", type=int)

    query = Assignment.query
    if course_id is not None:
        Course.query.get_or_404(course_id)
        query = query.filter_by(course_id=course_id)

    assignments = query.order_by(Assignment.due_date.asc()).all()
    return jsonify([assignment.to_dict() for assignment in assignments]), 200


@bp.route("", methods=["POST"])
@jwt_required(optional=True)
def create_assignment():
    """
    Create a new assignment (admin only)
    ---
    tags:
      - Assignments
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            course_id:
              type: integer
            title:
              type: string
            description:
              type: string
            due_date:
              type: string
              format: date-time
              example: "2025-12-31T23:59:59"
            teacher_id:
              type: integer
            optional:
              type: boolean
              default: false
          required:
            - course_id
            - title
            - description
            - due_date
            - teacher_id
    responses:
      201:
        description: Assignment created successfully
      400:
        description: Missing required fields or invalid date format
      403:
        description: User is not an administrator or doesn't own course
      404:
        description: Course or teacher not found
      500:
        description: Internal server error
    """
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

    teacher = resolve_user(teacher_id, required_role=UserRole.ADMIN, allow_token=True, require=True)
    teacher_id = teacher.id

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
@jwt_required(optional=True)
def upsert_assignment_grade(assignment_id):
    """
    Create or update assignment grade for a student
    ---
    tags:
      - Assignments
    parameters:
      - name: assignment_id
        in: path
        type: integer
        required: true
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            teacher_id:
              type: integer
            student_id:
              type: integer
            score:
              type: number
              example: 85.5
            comment:
              type: string
          required:
            - teacher_id
            - student_id
            - score
    responses:
      201:
        description: Grade created
      200:
        description: Grade updated
      400:
        description: Invalid parameters
      403:
        description: User doesn't own this assignment or student is not a student
      404:
        description: Assignment, teacher, or student not found
      500:
        description: Internal server error
    """

    assignment = Assignment.query.get_or_404(assignment_id)

    data = request.get_json(silent=True)
    if data is None:
        abort(400, description="request payload must be valid JSON")

    teacher_raw = data.get("teacher_id")
    if teacher_raw is None:
        abort(400, description="teacher_id is required")
    try:
        teacher_id = int(teacher_raw)
    except (TypeError, ValueError):
        abort(400, description="teacher_id must be an integer")

    student_raw = data.get("student_id")
    if student_raw is None:
        abort(400, description="student_id is required")
    try:
        student_id = int(student_raw)
    except (TypeError, ValueError):
        abort(400, description="student_id must be an integer")

    score_raw = data.get("score")
    if score_raw is None:
        abort(400, description="score is required")
    try:
        score = float(score_raw)
    except (TypeError, ValueError):
        abort(400, description="score must be a number")
    comment_raw = data.get("comment")
    comment = str(comment_raw).strip() if comment_raw is not None else None
    if comment == "":
        comment = None

    teacher = resolve_user(teacher_id, required_role=UserRole.ADMIN, allow_token=True, require=True)
    teacher_id = teacher.id
    if teacher.id != assignment.teacher_id:
        abort(403, description="teacher does not own this assignment")

    student = User.query.get_or_404(student_id)
    if student.role != UserRole.STUDENT:
        abort(403, description="grades may only be recorded for students")

    ensure_student_enrolled(assignment.course_id, student.id)

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
@jwt_required(optional=True)
def list_assignment_grades(assignment_id):
    """
    List grades for an assignment
    ---
    tags:
      - Assignments
    parameters:
      - name: assignment_id
        in: path
        type: integer
        required: true
      - name: viewer_id
        in: query
        type: integer
      - name: student_id
        in: query
        type: integer
        description: Filter by student (teachers only)
      - name: include_related
        in: query
        type: string
        enum: ["true", "false"]
        description: Include related user and assignment data
    responses:
      200:
        description: List of grades
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              student_id:
                type: integer
              score:
                type: number
              comment:
                type: string
              graded_at:
                type: string
      401:
        description: Authentication required
      403:
        description: Insufficient permissions
      404:
        description: Assignment not found
    """

    assignment = Assignment.query.get_or_404(assignment_id)

    viewer_id = request.args.get("viewer_id", type=int)
    viewer = resolve_user(viewer_id, allow_token=True, require=True)
    if viewer_id and viewer_id != viewer.id:
        abort(403, description="viewer_id does not match authenticated user")
    include_related_raw = request.args.get("include_related")
    if include_related_raw is None:
        include_related = True
    else:
        include_related = str(include_related_raw).strip().lower() in {"1", "true", "yes", "on"}

    query = AssignmentGrade.query.filter_by(assignment_id=assignment.id)

    if viewer.role == UserRole.STUDENT:
        ensure_student_enrolled(assignment.course_id, viewer.id)
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
