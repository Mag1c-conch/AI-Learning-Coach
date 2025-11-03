from flask import Blueprint, abort, current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename
import os

from ..extensions import db
from ..models import Course, Material, User, UserRole

bp = Blueprint("material", __name__, url_prefix="/materials")


def _reserve_unique_filename(directory: str, filename: str) -> str:
    safe_name = secure_filename(filename) or "uploaded_file"
    name, ext = os.path.splitext(safe_name)
    candidate = safe_name
    counter = 1

    while os.path.exists(os.path.join(directory, candidate)):
        candidate = f"{name}_{counter}{ext}"
        counter += 1
    return candidate


@bp.route("", methods=["GET"])
def list_materials():
    """
    Optional query parameters:
    - course_id: int, filter materials by course
    Returns 200 with an array of material JSON objects.
    """
    course_id = request.args.get("course_id", type=int)

    query = Material.query
    if course_id is not None:
        Course.query.get_or_404(course_id)
        query = query.filter_by(course_id=course_id)

    materials = query.order_by(Material.uploaded_at.desc()).all()
    return jsonify([material.to_dict() for material in materials]), 200


# upload new material to a course (only admin)
@bp.route("", methods=["POST"])
def upload_material():
    """
    Expects multipart/form-data payload with fields:
    - file: binary file object to upload
    - course_id: int, target course ID
    - uploaded_by: int, admin user ID performing the upload
    Optional form fields (if provided will be saved):
    - file_type: str, one of {assignment, quiz, lab, lecture_slide, learning_material, practice}
    - week_number: int, 1-based week index
    Returns 201 with the created material JSON on success.
    """
    if "file" not in request.files:
        abort(400, description="No file part in the request")

    file = request.files["file"]
    if file.filename == "":
        abort(400, description="file name is empty")

    course_id = request.form.get("course_id", type=int)
    uploaded_by = request.form.get("uploaded_by", type=int)  # admin user id
    if not course_id or not uploaded_by:
        abort(400, description="missing required fields")

    course = Course.query.get_or_404(course_id)
    user = User.query.get_or_404(uploaded_by)

    # check if the user is admin
    if user.role != UserRole.ADMIN:
        abort(403, description="only administrators may upload materials")

    # save file to upload folder
    root = current_app.config["UPLOAD_FOLDER"]
    course_dir = os.path.join(root, str(course_id))
    os.makedirs(course_dir, exist_ok=True)

    original_name = file.filename
    stored_name = _reserve_unique_filename(course_dir, original_name)
    file_path = os.path.join(course_dir, stored_name)
    file.save(file_path)

    file_type = request.form.get("file_type")
    week_number = request.form.get("week_number", type=int)

    # normalize file_type to a small whitelist if present
    _allowed_types = {"assignment", "quiz", "lab", "lecture_slide", "learning_material", "practice"}
    if file_type and file_type not in _allowed_types:
        abort(400, description="invalid file_type")

    material = Material(
        course_id=course_id,
        original_name=original_name,
        stored_name=stored_name,
        uploaded_by=user.id,
        file_size=os.path.getsize(file_path),
        file_type=file_type,
        week_number=week_number,
    )
    try:
        db.session.add(material)
        db.session.commit()
        return jsonify(material.to_dict()), 201
    except Exception as exc:
        db.session.rollback()
        abort(500, description=str(exc))


@bp.route("/<int:material_id>", methods=["DELETE"])
def delete_material(material_id: int):
    """
    Expects query parameter:
    - deleted_by: int, admin user ID performing the deletion
    Removes the file from storage (if present) and deletes the DB record.
    Returns 200 with a confirmation message on success.
    """
    deleted_by = request.args.get("deleted_by", type=int)
    if not deleted_by:
        abort(400, description="missing required deleted_by param")

    user = User.query.get_or_404(deleted_by)
    if user.role != UserRole.ADMIN:
        abort(403, description="only administrators may delete materials")

    material = Material.query.get_or_404(material_id)

    # attempt to remove the stored file; ignore if it does not exist
    file_path = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        str(material.course_id),
        material.stored_name,
    )
    try:
        if os.path.isfile(file_path):
            os.remove(file_path)
    except OSError as exc:
        abort(500, description=f"failed to delete file: {exc}")

    try:
        db.session.delete(material)
        db.session.commit()
        return jsonify({"status": "deleted", "material_id": material_id}), 200
    except Exception as exc:
        db.session.rollback()
        abort(500, description=str(exc))


@bp.route("/<int:material_id>/download", methods=["GET"])
def download_material(material_id: int):
    """
    Streams the stored file associated with the material record.
    Returns 200 with the file content when available.
    """
    material = Material.query.get_or_404(material_id)

    file_path = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        str(material.course_id),
        material.stored_name,
    )
    if not os.path.isfile(file_path):
        abort(404, description="file not found on server")

    return send_file(
        file_path,
        as_attachment=True,
        download_name=material.original_name,
    )
