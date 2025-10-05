from flask import Blueprint, request, jsonify, abort
from ..extensions import db
from ..models import User, UserRole, Course, Enrollment
bp=Blueprint('course', __name__, url_prefix='/courses')
# Create a new course
@bp.route("",methods=['POST'])
def create_course():
    data=request.json
    course_name=data.get('course_name')
    course_code=data.get('course_code')
    description=data.get('description')
    created_by=data.get('created_by')
    # check if course code already exists
    if Course.query.filter_by(code=course_code).first():
        abort(409, description="course code already exists")
    # validate input
    if not all([course_name, course_code, created_by]):
        abort(400, description="missing required fields")
    # check if the user is admin
    admin = User.query.get_or_404(created_by)
    if admin.role != UserRole.ADMIN:
        abort(403, description="only administrators may create courses")
    new_course=Course(
        name=course_name,
        code=course_code,
        description=description,
        created_by=created_by
        )
    try:
        db.session.add(new_course)
        db.session.commit()
        return jsonify(new_course.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        abort(500, description=str(e))
# list all courses
@bp.route("",methods=['GET'])
def list_courses():
    # Fetch all courses from the database, ordered by creation date
    courses = Course.query.order_by(Course.created_at.desc()).all()
    return jsonify([course.to_dict() for course in courses]), 200