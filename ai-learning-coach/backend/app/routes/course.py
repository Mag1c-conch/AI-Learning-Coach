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

def build_course_payload(course):
    user = User.query.get(course.created_by) if getattr(course, "created_by", None) else None
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

        for value in candidates:
            if value and isinstance(value, str) and "@" in value:
                teacher_email = value.strip()
                break

    # count enrolled students
    student_count = Enrollment.query.filter_by(course_id=course.id).count()

    data = course.to_dict()
    data["creator_name"] = teacher_name
    data["teacher"] = teacher_name
    data["email"] = teacher_email
    data["student_count"] = student_count
    return data

# list all courses
@bp.route("", methods=['GET'])
def list_courses():
    created_by_param = request.args.get("created_by")

    query = Course.query
    if created_by_param is not None:
        try:
            created_by = int(created_by_param)
        except (TypeError, ValueError):
            abort(400, description="created_by must be an integer")

        creator = User.query.get_or_404(created_by)
        if creator.role != UserRole.ADMIN:
            abort(403, description="created_by must reference an administrator account")

        query = query.filter(Course.created_by == created_by)

    courses = query.order_by(Course.created_at.desc()).all()
    return jsonify([build_course_payload(course) for course in courses]), 200

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
        
# Give extra points
@bp.route("/<int:course_id>/extra",methods=['POST'])
def give_extra_points(course_id):
    data=request.json
    student_id=data.get('student_id')
    points_to_add=data.get('points_to_add')
    # validate input
    if not student_id or not points_to_add:
        abort(400, description="missing required fields")
    # check if the course exists
    course = Course.query.get_or_404(course_id)
    # check if the user exists and is a student
    student = User.query.get_or_404(student_id)
    if student.role != UserRole.STUDENT:
        abort(403, description="only students may enroll in courses")
    # check if the student is already enrolled in the course
    enrollment = Enrollment.query.filter_by(course_id=course_id, user_id=student_id).first_or_404()
    enrollment.extra_score += points_to_add
    try:
        db.session.commit()
        return jsonify({
            "message": f"Student {student_id} add rewards successfully."
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
    
    # Add enrolled student count to the payload
    student_count = Enrollment.query.filter_by(course_id=course.id).count()
    data["student_count"] = student_count
    
    return jsonify(data), 200
        
# list all courses a student is enrolled in 
@bp.route("/users/<int:user_id>/enrollments", methods=["GET"])
def list_user_enrollments(user_id):
    # ensure user esists
    user = User.query.get_or_404(user_id)

    query = (
        db.session.query(Enrollment)
        .join(Course, Enrollment.course_id == Course.id)
        .filter(Enrollment.user_id == user_id)
        .order_by(Course.created_at.desc())
    )

    # Optional filter by course_id
    course_id_param = request.args.get("course_id", type=int)
    if course_id_param:
        query = query.filter(Enrollment.course_id == course_id_param)

    # Optional reward threshold (>=)
    min_reward = request.args.get("min_reward", type=int)
    if min_reward is not None:
        query = query.filter(Enrollment.extra_score >= min_reward)

    enrollments = query.all()

    results = []
    for enrollment in enrollments:
        course = enrollment.course
        results.append(
            {
                "id": course.id,
                "code": course.code,
                "name": getattr(course, "name", "") or "",
                "title": getattr(course, "name", "") or "",
                "description": getattr(course, "description", "") or "",
                "reward": enrollment.extra_score,
                "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            }
        )

    return jsonify(results), 200

# Get all students enrolled in a course
@bp.route("/<int:course_id>/students", methods=["GET"])
def list_course_students(course_id):
    # Ensure the course exists
    course = Course.query.get_or_404(course_id)

    # Query every student enrolled in the course
    students = (
        db.session.query(User)
        .join(Enrollment, Enrollment.user_id == User.id)
        .filter(Enrollment.course_id == course_id)
        .filter(User.role == UserRole.STUDENT)
        .order_by(User.first_name, User.last_name)
        .all()
    )

    # Build the response payload
    result = []
    for student in students:
        enrollment = Enrollment.query.filter_by(
            course_id=course_id,
            user_id=student.id
        ).first()
        
        result.append({
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "username": student.username,
            "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment else None,
            "reward": enrollment.extra_score
        })
    
    return jsonify(result), 200
