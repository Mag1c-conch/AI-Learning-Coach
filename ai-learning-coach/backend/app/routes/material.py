from flask import Blueprint, request, jsonify, abort
from ..extensions import db
from ..models import User, UserRole, Course, Enrollment, Material
from sqlalchemy.exc import IntegrityError
import os
import uuid
from flask import current_app
from werkzeug.utils import secure_filename
bp=Blueprint('material', __name__, url_prefix='/materials')
# upload new material to a course (only admin)
@bp.route("",methods=['POST'])
def upload_material():
    if 'file' not in request.files:
        abort(400, description="No file part in the request")
    file=request.files['file']
    if file.filename == '':
        abort(400, description="file name is empty")
        
    course_id=request.form.get('course_id', type=int)
    uploaded_by=request.form.get('uploaded_by', type=int)  # admin user id
    if not course_id or not uploaded_by:
        abort(400, description="missing required fields")
    course=Course.query.get_or_404(course_id)
    user=User.query.get_or_404(uploaded_by)
    # check if the user is admin
    if user.role != UserRole.ADMIN:
        abort(403, description="only administrators may upload materials")
    # save file to upload folder
    root = current_app.config['UPLOAD_FOLDER']
    course_dir=os.path.join(root, str(course_id))
    os.makedirs(course_dir, exist_ok=True)
    
    original_name=file.filename
    stored_name = f"{uuid.uuid4().hex}_{secure_filename(original_name)}"
    file_path=os.path.join(course_dir, stored_name)
    file.save(file_path)
    
    material = Material(
        course_id=course_id,
        original_name=original_name,
        stored_name=stored_name,
        uploaded_by=user.id,
        file_size=os.path.getsize(file_path)
    )
    try:
        db.session.add(material)
        db.session.commit()
        return jsonify(material.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        abort(500, description=str(e))