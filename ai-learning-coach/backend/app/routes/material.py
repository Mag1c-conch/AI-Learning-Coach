from flask import Blueprint, abort, current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename
import os
from datetime import datetime, timezone
from sqlalchemy import or_, select
from zoneinfo import ZoneInfo

from ..extensions import db
from ..models import Assignment, Course, Enrollment, Material, User, UserRole

bp = Blueprint("material", __name__, url_prefix="/materials")


def material_file_path(material):
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


def delete_material_file(material):
    file_path = material_file_path(material)
    if os.path.isfile(file_path):
        os.remove(file_path)


def iso_utc(dt):
    """Return a UTC ISO8601 string (trailing Z) for the provided datetime."""
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def build_submission_stored_name(course_dir, assignment, student, original_name):
    assignment_dir = os.path.join(course_dir, str(assignment.id))
    os.makedirs(assignment_dir, exist_ok=True)

    _, original_ext = os.path.splitext(original_name)
    stored_name = f"{student.id}{original_ext}"
    return assignment_dir, stored_name


def material_with_student_dict(material):
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


def ensure_student_enrolled(course_id, student_id):
    if not Enrollment.query.filter_by(course_id=course_id, user_id=student_id).first():
        abort(403, description="student is not enrolled in this course")


@bp.route("", methods=["GET"])
def list_materials():

    course_id = request.args.get("course_id", type=int)
    include_submissions = request.args.get("include_submissions", "false").lower() in {"true", "1", "yes"}

    query = Material.query
    if course_id is not None:
        Course.query.get_or_404(course_id)
        query = query.filter_by(course_id=course_id)

    if not include_submissions:
        query = query.filter(or_(Material.assignment_id.is_(None), Material.file_type != "assignment_submission"))

    materials = query.order_by(Material.uploaded_at.desc()).all()

    # Batch fetch assignments so the frontend does not fall back to uploaded_at when due_date is missing
    assign_ids = {m.assignment_id for m in materials if m.assignment_id}
    assign_map = {}
    if assign_ids:
        rows = db.session.execute(
            select(Assignment).where(Assignment.id.in_(assign_ids))
        ).scalars().all()
        for a in rows:
            assign_map[a.id] = a

    out = []
    for m in materials:
        d = m.to_dict()
        if m.assignment_id and m.assignment_id in assign_map:
            a = assign_map[m.assignment_id]
            d["assignment"] = {
                "id": a.id,
                "title": a.title,
                "due_date": iso_utc(a.due_date),  # Normalize to a Z-suffixed ISO string
            }
        out.append(d)
    return jsonify(out), 200


# upload new material to a course (only admin)
@bp.route("", methods=["POST"])
def upload_material():

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
                title_candidate = custom_name or os.path.splitext(original_name)[0] or f"{file_type.title()} task"

            description = (
                request.form.get("assignment_description")
                or request.form.get("description")
                or request.form.get("additional_notes")
                or None
            )
            raw_due = (
                request.form.get("assignment_due_date")
                or request.form.get("due_date")
                or request.form.get("deadline")
            )
            due_date = None
            if raw_due:
                s = str(raw_due).strip()
                LOCAL_TZ = ZoneInfo(current_app.config.get("LOCAL_TZ", "Australia/Sydney"))
                if s.isdigit():
                    iv = int(s)
                    if iv < 10**12:
                        due_date = datetime.fromtimestamp(iv, tz=timezone.utc)
                    else:
                        due_date = datetime.fromtimestamp(iv / 1000, tz=timezone.utc)
                else:
                    if s.endswith("Z"):
                        s = s[:-1] + "+00:00"
                    if " " in s and len(s) >= 10 and s[4] == "-" and s[7] == "-":
                        s = s.replace(" ", "T")
                    if len(s) == 10 and s[4] == "-" and s[7] == "-" and s[:4].isdigit():
                        try:
                            base = datetime.strptime(s, "%Y-%m-%d")
                            due_date = base.replace(hour=23, minute=59, second=59, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
                        except ValueError:
                            abort(400, description="assignment_due_date invalid 'YYYY-MM-DD'")
                    else:
                        try:
                            parsed = datetime.fromisoformat(s)
                            if parsed.tzinfo is None:
                                parsed = parsed.replace(tzinfo=LOCAL_TZ)
                            due_date = parsed.astimezone(timezone.utc)
                        except ValueError:
                            abort(400, description="assignment_due_date must be ISO8601/date/timestamp")

            raw_optional = request.form.get("assignment_optional")
            if raw_optional is None:
                optional_flag = None
            elif isinstance(raw_optional, bool):
                optional_flag = raw_optional
            else:
                normalized = str(raw_optional).strip().lower()
                if normalized in {"1", "true", "yes", "on"}:
                    optional_flag = True
                elif normalized in {"0", "false", "no", "off"}:
                    optional_flag = False
                else:
                    optional_flag = None

            assignment = Assignment(
                course_id=course.id,
                teacher_id=user.id,
                title=title_candidate,
                description=description,
                due_date=due_date,  # Already normalized to a UTC tz-aware datetime
                optional=bool(optional_flag) if optional_flag is not None else False,
            )
            db.session.add(assignment)
            db.session.flush()

        assignment_dir = os.path.join(course_dir, str(assignment.id))
        os.makedirs(assignment_dir, exist_ok=True)

    safe_custom = secure_filename(custom_name or "")
    base_name = ""
    if safe_custom:
        base_name = os.path.splitext(safe_custom)[0]
    candidate_name = f"{base_name}{os.path.splitext(original_name)[1]}" if base_name else original_name

    target_dir = assignment_dir or course_dir
    safe_name = secure_filename(candidate_name) or "uploaded_file"
    name, ext = os.path.splitext(safe_name)
    stored_name = safe_name
    counter = 1
    while os.path.exists(os.path.join(target_dir, stored_name)):
        stored_name = f"{name}_{counter}{ext}"
        counter += 1
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
        payload["assignment"] = {
            **assignment.to_dict(),
            "due_date": iso_utc(assignment.due_date),
        }
    return jsonify(payload), 201


@bp.route("/<int:material_id>", methods=["DELETE"])
def delete_material(material_id):

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
        delete_material_file(material)
        for extra in extra_materials:
            delete_material_file(extra)
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


# Download file
@bp.route("/<int:material_id>/download", methods=["GET"])
def download_material(material_id):

    material = Material.query.get_or_404(material_id)
    file_path = material_file_path(material)
    if not os.path.isfile(file_path):
        abort(404, description="file not found on server")

    # Support preview mode
    preview_mode = request.args.get('preview', 'false').lower() in ['true', '1', 'yes']
    
    return send_file(
        file_path,
        as_attachment=not preview_mode,  # preview mode keeps as_attachment=False
        download_name=material.original_name,
    )


# Submit file (students)
@bp.route("/assignments/<int:assignment_id>/submissions", methods=["POST"])
def submit_assignment_material(assignment_id):

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

    ensure_student_enrolled(assignment.course_id, student.id)

    root = current_app.config["UPLOAD_FOLDER"]
    course_dir = os.path.join(root, str(assignment.course_id))
    os.makedirs(course_dir, exist_ok=True)

    assignment_dir, stored_name = build_submission_stored_name(
        course_dir, assignment, student, file.filename
    )
    file_path = os.path.join(assignment_dir, stored_name)

    # Replace the existing submission from the same student
    previous_submissions = Material.query.filter_by(
        assignment_id=assignment.id,
        uploaded_by=student.id,
    ).all()
    for previous in previous_submissions:
        delete_material_file(previous)
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
        return jsonify(material_with_student_dict(submission)), 201
    except Exception as exc:
        db.session.rollback()
        delete_material_file(submission)
        abort(500, description=str(exc))


@bp.route("/assignments/<int:assignment_id>/submissions", methods=["GET"])
def list_assignment_submissions(assignment_id):

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
        ensure_student_enrolled(assignment.course_id, viewer.id)
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
    return jsonify([material_with_student_dict(m) for m in submissions]), 200
