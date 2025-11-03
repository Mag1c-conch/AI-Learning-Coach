from flask import Blueprint, request, jsonify, abort
from ..extensions import db
from ..models import User, UserRole, Course, Enrollment
from sqlalchemy.exc import IntegrityError
bp=Blueprint('course', __name__, url_prefix='/courses')
# Create a new course (only admin)
@bp.route("",methods=['POST'])
def create_course():
    data=request.json
    course_name=data.get('course_name')
    course_code=data.get('course_code')
    description=data.get('description')
    image_url=data.get('image_url')  # optional image URL
    created_by=data.get('created_by')     # admin user id
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
        image_url=image_url,
        created_by=created_by
        )
    try:
        db.session.add(new_course)
        db.session.commit()
        return jsonify(new_course.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        abort(500, description=str(e))
# TODO: Delete a course
@bp.route("/<int:course_id>",methods=['DELETE'])
def delete_course(course_id):
    data=request.json or {}
    deleted_by=data.get('deleted_by')    # admin user id
    if not deleted_by:
        abort(400, description="missing required fields")
    admin=User.query.get_or_404(deleted_by)
    if admin.role != UserRole.ADMIN:
        abort(403, description="only administrators may delete courses")
    course=Course.query.get_or_404(course_id)
    try:
        db.session.delete(course)
        db.session.commit()
        return jsonify({
            "message": f"Course {course_id} deleted successfully."
        }), 200
    except Exception as e:
        db.session.rollback()
        abort(500, description=str(e))

# list all courses
@bp.route("", methods=['GET'])
def list_courses():
    courses = Course.query.order_by(Course.created_at.desc()).all()
    result = []
    for c in courses:
        user = User.query.get(c.created_by) if getattr(c, "created_by", None) else None
        if user:
            first = (getattr(user, "first_name", "") or "").strip()
            last = (getattr(user, "last_name", "") or "").strip()
            teacher_name = (f"{first} {last}").strip() or None
        else:
            teacher_name = None
        teacher_email = None
        if user:
            candidates = [
                getattr(user, "email", None),
                getattr(user, "email_address", None),
                getattr(user, "mail", None),
            ]
            uname = getattr(user, "username", None)
            if uname and isinstance(uname, str) and "@" in uname:
                candidates.append(uname)

            for v in candidates:
                if v and isinstance(v, str) and "@" in v:
                    teacher_email = v.strip()
                    break
        d = c.to_dict()
        d["creator_name"] = teacher_name
        d["teacher"] = teacher_name
        d["email"] = teacher_email
        result.append(d)
    return jsonify(result), 200

# Enroll a student in a course
@bp.route("/<int:course_id>/enroll",methods=['POST'])
def enroll_student(course_id):
    data=request.json
    student_id=data.get('student_id')
    # validate input
    if not student_id:
        abort(400, description="missing required fields")
    # check if the course exists
    course = Course.query.get_or_404(course_id)
    # check if the user exists and is a student
    student = User.query.get_or_404(student_id)
    if student.role != UserRole.STUDENT:
        abort(403, description="only students may enroll in courses")
    # check if the student is already enrolled in the course
    if Enrollment.query.filter_by(course_id=course_id, user_id=student_id).first():
        abort(409, description="student already enrolled in this course")
    enrollment = Enrollment(course_id=course_id, user_id=student_id)
    try:
        db.session.add(enrollment)
        db.session.commit()
        return jsonify({
            "message": f"Student {student_id} enrolled in course {course_id} successfully."
        }), 201
    except IntegrityError:
        db.session.rollback()
        abort(409, description="student already enrolled in this course")
    except Exception as e:
        db.session.rollback()
        abort(500, description=str(e))

# Get course details
@bp.route("/<int:course_id>", methods=["GET"])
def get_course(course_id):
    course = Course.query.get_or_404(course_id)
    data = course.to_dict()
    creator = User.query.get(course.created_by) if course.created_by else None
    if creator:
        first = (creator.first_name or "").strip()
        last = (creator.last_name or "").strip()
        teacher_name = (f"{first} {last}").strip()
        data["teacher"] = teacher_name or None
        data["creator_name"] = teacher_name or None
    return jsonify(data), 200
        
# list all courses a student is enrolled in 
@bp.route("/users/<int:user_id>/enrollments", methods=["GET"])
def list_user_enrollments(user_id):
    # ensure user esists
    user = User.query.get_or_404(user_id)

    # select courses user is enrolled in 
    courses = (
        db.session.query(Course)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.user_id == user_id)
        .order_by(Course.created_at.desc())
        .all()
    )

    # return courses as list of dicts
    def to_dict(c: Course):
        return {
            "id": c.id,
            "code": c.code,
            "name": getattr(c, "name", "") or "",
            "title": getattr(c, "name", "") or "",  
            "description": getattr(c, "description", "") or "",
        }

    return jsonify([to_dict(c) for c in courses]), 200
