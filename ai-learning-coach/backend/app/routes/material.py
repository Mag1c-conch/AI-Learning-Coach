from flask import Blueprint, abort, current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from sqlalchemy import or_

from ..extensions import db
from ..models import Assignment, Course, Enrollment, Material, User, UserRole

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


def _material_file_path(material: Material) -> str:
    root = current_app.config["UPLOAD_FOLDER"]
    course_dir = os.path.join(root, str(material.course_id))
    if material.assignment_id:
        assignment_dir = os.path.join(course_dir, str(material.assignment_id))
        if material.file_type == "assignment_submission":
            student_dir = os.path.join(assignment_dir, "student_uploads")
            candidate = os.path.join(student_dir, material.stored_name)
            if os.path.isfile(candidate):
                return candidate
            legacy_candidate = os.path.join(assignment_dir, material.stored_name)
            if os.path.isfile(legacy_candidate):
                return legacy_candidate
        else:
            candidate = os.path.join(assignment_dir, material.stored_name)
            if os.path.isfile(candidate):
                return candidate
    return os.path.join(course_dir, material.stored_name)


def _remove_file_from_disk(material: Material) -> None:
    file_path = _material_file_path(material)
    if os.path.isfile(file_path):
        os.remove(file_path)


def _sanitize_custom_basename(name: str) -> str:
    safe = secure_filename(name or "")
    if not safe:
        return ""
    base, _ = os.path.splitext(safe)
    return base




def _parse_bool(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return None


def _parse_due_date(raw):
    if not raw:
        return None
    if isinstance(raw, datetime):
        return raw
    normalized = str(raw).strip()
    if not normalized:
        return None
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        abort(400, description="assignment_due_date must be ISO 8601 formatted datetime string")

def _build_submission_stored_name(course_dir: str, assignment: Assignment, student: User, original_name: str) -> tuple[str, str]:
    assignment_dir = os.path.join(course_dir, str(assignment.id))
    os.makedirs(assignment_dir, exist_ok=True)
    student_upload_dir = os.path.join(assignment_dir, "student_uploads")
    os.makedirs(student_upload_dir, exist_ok=True)

    _, original_ext = os.path.splitext(original_name)
    stored_name = f"{student.id}{original_ext}"
    return student_upload_dir, stored_name


def _material_with_student_dict(material: Material) -> dict:
    data = material.to_dict()
    student = User.query.get(material.uploaded_by)
    if student and student.role == UserRole.STUDENT:
        data["student"] = {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "username": student.username,
        }
    else:
        data["student"] = None
    return data


def _ensure_student_enrolled(course_id: int, student_id: int) -> None:
    if not Enrollment.query.filter_by(course_id=course_id, user_id=student_id).first():
        abort(403, description="student is not enrolled in this course")


@bp.route("", methods=["GET"])
def list_materials():
    """
    Optional query parameters:
    - course_id: int, filter materials by course
    - include_submissions: bool, when true include student assignment submissions (default false)
    Returns 200 with an array of material JSON objects.
    """
    course_id = request.args.get("course_id", type=int)
    include_submissions = request.args.get("include_submissions", "false").lower() in {
        "true",
        "1",
        "yes",
    }

    query = Material.query
    if course_id is not None:
        Course.query.get_or_404(course_id)
        query = query.filter_by(course_id=course_id)

    if not include_submissions:
        query = query.filter(or_(Material.assignment_id.is_(None), Material.file_type != "assignment_submission"))

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
    Optional form fields:
    - file_type: str, one of {assignment, quiz, lab, lecture_slide, learning_material, practice}
    - week_number: int, 1-based week index
    - custom_name: str, rename the stored file
    - assignment_id: link to an existing assignment when file_type is assignment/quiz/lab
    - assignment_title / assignment_description / assignment_due_date / assignment_optional: metadata for a new assignment
    Returns 201 with the created material JSON (and assignment metadata when applicable).
    """
    if "file" not in request.files:
        abort(400, description="No file part in the request")

    file = request.files["file"]
    if file.filename == "":
        abort(400, description="file name is empty")

    course_id = request.form.get("course_id", type=int)
    uploaded_by = request.form.get("uploaded_by", type=int)
    if not course_id or not uploaded_by:
        abort(400, description="missing required fields")

    course = Course.query.get_or_404(course_id)
    user = User.query.get_or_404(uploaded_by)

    if user.role != UserRole.ADMIN:
        abort(403, description="only administrators may upload materials")

    root = current_app.config["UPLOAD_FOLDER"]
    course_dir = os.path.join(root, str(course_id))
    os.makedirs(course_dir, exist_ok=True)

    original_name = file.filename
    custom_name = request.form.get("custom_name", "").strip()
    file_type = request.form.get("file_type")
    week_number = request.form.get("week_number", type=int)

    allowed_types = {"assignment", "quiz", "lab", "lecture_slide", "learning_material", "practice"}
    if file_type and file_type not in allowed_types:
        abort(400, description="invalid file_type")

    assignment = None
    assignment_dir = None
    if file_type in {"assignment", "quiz", "lab"}:
        assignment_id = request.form.get("assignment_id", type=int)
        if assignment_id:
            assignment = Assignment.query.get_or_404(assignment_id)
            if assignment.course_id != course.id:
                abort(400, description="assignment does not belong to the provided course")
            if assignment.teacher_id != user.id:
                abort(403, description="only the assignment owner may attach materials")
        else:
            title_candidate = request.form.get("assignment_title")
            if not title_candidate:
                title_candidate = custom_name or os.path.splitext(original_name)[0]
            if not title_candidate:
                title_candidate = f"{file_type.title()} task"

            description = (
                request.form.get("assignment_description")
                or request.form.get("description")
                or request.form.get("additional_notes")
                or None
            )
            due_date = _parse_due_date(
                request.form.get("assignment_due_date")
                or request.form.get("due_date")
                or request.form.get("deadline")
            )
            optional_flag = _parse_bool(request.form.get("assignment_optional"))

            assignment = Assignment(
                course_id=course.id,
                teacher_id=user.id,
                title=title_candidate,
                description=description,
                due_date=due_date,
                optional=bool(optional_flag) if optional_flag is not None else False,
            )
            db.session.add(assignment)
            db.session.flush()

        assignment_dir = os.path.join(course_dir, str(assignment.id))
        os.makedirs(assignment_dir, exist_ok=True)

    base_name = _sanitize_custom_basename(custom_name)
    if base_name:
        _, ext = os.path.splitext(original_name)
        candidate_name = f"{base_name}{ext}"
    else:
        candidate_name = original_name

    target_dir = assignment_dir or course_dir
    stored_name = _reserve_unique_filename(target_dir, candidate_name)
    file_path = os.path.join(target_dir, stored_name)
    file.save(file_path)

    material = Material(
        course_id=course_id,
        assignment_id=assignment.id if assignment else None,
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
    except Exception as exc:
        db.session.rollback()
        try:
            if os.path.isfile(file_path):
                os.remove(file_path)
        except OSError:
            pass
        abort(500, description=str(exc))

    payload = material.to_dict()
    if assignment:
        payload["assignment"] = assignment.to_dict()
    return jsonify(payload), 201

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
    assignment_to_remove = None
    extra_materials = []
    if material.assignment_id and material.file_type in {"assignment", "quiz", "lab"}:
        assignment_to_remove = material.assignment or Assignment.query.get(material.assignment_id)
        if assignment_to_remove:
            extra_materials = (
                Material.query.filter(Material.assignment_id == assignment_to_remove.id, Material.id != material.id)
                .order_by(Material.uploaded_at.desc())
                .all()
            )

    try:
        _remove_file_from_disk(material)
        for extra in extra_materials:
            _remove_file_from_disk(extra)
    except OSError as exc:
        abort(500, description=f"failed to delete file: {exc}")

    try:
        for extra in extra_materials:
            db.session.delete(extra)
        if assignment_to_remove:
            db.session.delete(assignment_to_remove)
        db.session.delete(material)
        db.session.commit()
        response_payload = {"status": "deleted", "material_id": material_id}
        if assignment_to_remove:
            response_payload["assignment_id"] = assignment_to_remove.id
        return jsonify(response_payload), 200
    except Exception as exc:
        db.session.rollback()
        abort(500, description=str(exc))

# 下载文件
@bp.route("/<int:material_id>/download", methods=["GET"])
def download_material(material_id: int):
    """
    Streams the stored file associated with the material record.
    Returns 200 with the file content when available.
    Query parameter 'preview=true' to view inline instead of download.
    """
    material = Material.query.get_or_404(material_id)

    file_path = _material_file_path(material)
    if not os.path.isfile(file_path):
        abort(404, description="file not found on server")

    # 支持预览模式
    preview_mode = request.args.get('preview', 'false').lower() in ['true', '1', 'yes']
    
    return send_file(
        file_path,
        as_attachment=not preview_mode,  # preview模式时as_attachment=False
        download_name=material.original_name,
    )

# 提交文件（students）
@bp.route("/assignments/<int:assignment_id>/submissions", methods=["POST"])
def submit_assignment_material(assignment_id: int):
    """
    Allows a student to upload an assignment submission.
    Expects multipart/form-data payload with fields:
    - file: binary file object to upload
    - student_id: int, id of the student submitting
    Returns 201 with created material JSON (including student info).
    """
    assignment = Assignment.query.get_or_404(assignment_id)

    if "file" not in request.files:
        abort(400, description="No file part in the request")

    file = request.files["file"]
    if file.filename == "":
        abort(400, description="file name is empty")

    student_id = request.form.get("student_id", type=int)
    if not student_id:
        abort(400, description="missing required student_id")

    student = User.query.get_or_404(student_id)
    if student.role != UserRole.STUDENT:
        abort(403, description="only students may submit assignments")

    _ensure_student_enrolled(assignment.course_id, student.id)

    root = current_app.config["UPLOAD_FOLDER"]
    course_dir = os.path.join(root, str(assignment.course_id))
    os.makedirs(course_dir, exist_ok=True)

    assignment_dir, stored_name = _build_submission_stored_name(
        course_dir,
        assignment,
        student,
        file.filename,
    )
    file_path = os.path.join(assignment_dir, stored_name)

    # Replace previous submissions from same student
    previous_submissions = Material.query.filter_by(
        assignment_id=assignment.id,
        uploaded_by=student.id,
    ).all()
    for previous in previous_submissions:
        _remove_file_from_disk(previous)
        db.session.delete(previous)

    file.save(file_path)

    submission = Material(
        course_id=assignment.course_id,
        assignment_id=assignment.id,
        original_name=file.filename,
        stored_name=stored_name,
        uploaded_by=student.id,
        file_size=os.path.getsize(file_path),
        file_type="assignment_submission",
        week_number=None,
    )

    try:
        db.session.add(submission)
        db.session.commit()
        return jsonify(_material_with_student_dict(submission)), 201
    except Exception as exc:
        db.session.rollback()
        _remove_file_from_disk(submission)
        abort(500, description=str(exc))


@bp.route("/assignments/<int:assignment_id>/submissions", methods=["GET"])
def list_assignment_submissions(assignment_id: int):
    """
    Lists assignment submissions. Requires query parameter:
    - viewer_id: id of the user requesting the list.
      * If viewer is the teacher (admin) who owns the assignment, returns all submissions.
      * If viewer is a student, returns only their submissions.
    Optional query parameters:
    - student_id: filter submissions to a specific student (teachers only).
    """
    assignment = Assignment.query.get_or_404(assignment_id)

    viewer_id = request.args.get("viewer_id", type=int)
    if not viewer_id:
        abort(400, description="missing required viewer_id")
    viewer = User.query.get_or_404(viewer_id)

    query = Material.query.filter_by(assignment_id=assignment.id).filter(
        Material.file_type == "assignment_submission"
    )

    if viewer.role == UserRole.STUDENT:
        if viewer.id != viewer_id:
            abort(403, description="students may only view their own submissions")
        _ensure_student_enrolled(assignment.course_id, viewer.id)
        query = query.filter_by(uploaded_by=viewer.id)
    elif viewer.role == UserRole.ADMIN:
        if viewer.id != assignment.teacher_id:
            abort(403, description="only the assignment owner may view all submissions")
        student_filter = request.args.get("student_id", type=int)
        if student_filter:
            query = query.filter_by(uploaded_by=student_filter)
    else:
        abort(403, description="unsupported user role")

    submissions = query.order_by(Material.uploaded_at.desc()).all()
    return jsonify([_material_with_student_dict(m) for m in submissions]), 200


