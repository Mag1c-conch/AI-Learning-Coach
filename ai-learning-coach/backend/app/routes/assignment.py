from flask import Blueprint, request, jsonify, abort
from ..extensions import db
from ..models import User, UserRole, Course, Enrollment, Assignment
from sqlalchemy.exc import IntegrityError
bp=Blueprint('assignment', __name__, url_prefix='/assignment')

@bp.route("",methods=['POST'])
def create_assignment():
    data=request.json
    course_id=data.get('course_id')
    title=data.get('title')
    description=data.get('descriotion')
    due_date=data.get('due_date')
    teacher_id=data.get('teacher_id')
    optional=data.get('optional')
    # check if course code already exists
    if not Course.query.filter_by(id=course_id).first():
        abort(404, description="course not exist")
    # validate input
    if not all([title, description, due_date, teacher_id]):
        abort(400, description="missing required fields")
    # check if the user is admin
    admin = User.query.get_or_404(teacher_id)
    if admin.role != UserRole.ADMIN:
        abort(403, description="only administrators may create assignments")
    new_assignment = Assignment(
        title=title,
        description=description,
        teacher_id=teacher_id,
        due_date=due_date,
        optional=optional,
        course_id=course_id
    )
    try:
        db.session.add(new_assignment)
        db.session.commit()
        return jsonify(new_assignment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        abort(500, description=str(e))