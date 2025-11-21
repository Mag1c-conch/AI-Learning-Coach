from datetime import datetime, timezone

from flask import Blueprint, abort, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from ..auth_utils import resolve_user
from ..extensions import db
from ..models import Course, Enrollment, StudyProgressItem, User, UserRole

bp = Blueprint("progress", __name__, url_prefix="/progress")


def _resolve_student(student_id):

    student = resolve_user(
        None,
        required_role=UserRole.STUDENT,
        allow_token=True,
        require=True,
    )
    if student.id != student_id:
        abort(403, description="students may only manage their own progress records")
    return student


def _resolve_teacher(course):

    teacher = resolve_user(
        None,
        required_role=UserRole.ADMIN,
        allow_token=True,
        require=True,
    )
    if teacher.id != course.created_by:
        abort(403, description="only the course creator may view this data")
    return teacher


def _ensure_enrolled(course_id, student_id):
    if not Enrollment.query.filter_by(course_id=course_id, user_id=student_id).first():
        abort(403, description="student is not enrolled in this course")


def _iso(dt):
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _normalize_items(payload):
    if not isinstance(payload, list):
        abort(400, description="items must be an array")

    items = []
    for raw in payload:
        if not isinstance(raw, dict):
            abort(400, description="each item must be an object")

        key = str(raw.get("item_key") or "").strip()
        if not key:
            abort(400, description="item_key is required")
        if len(key) > 128:
            abort(400, description="item_key must be <= 128 characters")

        percent_raw = raw.get("percent")
        if percent_raw is None:
            percent = 0
        else:
            try:
                numeric = float(percent_raw)
            except (TypeError, ValueError):
                abort(400, description="percent must be numeric")
            if numeric != numeric:  # NaN
                abort(400, description="percent must be a real number")
            percent = max(0, min(100, int(round(numeric))))

        def _limited_text(value, limit, field):
            if value is None:
                return None
            text = str(value).strip()
            if not text:
                return None
            if len(text) > limit:
                abort(400, description=f"{field} must be <= {limit} characters")
            return text

        items.append(
            {
                "item_key": key,
                "percent": percent,
                "item_type": _limited_text(raw.get("item_type"), 32, "item_type"),
                "title": _limited_text(raw.get("title"), 255, "title"),
                "metadata": raw.get("metadata"),
                "metadata_provided": "metadata" in raw,
            }
        )
    return items


@bp.route("/study/<int:student_id>/<int:course_id>", methods=["GET"])
@jwt_required()
def get_study_progress(student_id, course_id):
    student = _resolve_student(student_id)
    course = Course.query.get_or_404(course_id)
    _ensure_enrolled(course.id, student.id)

    items = (
        StudyProgressItem.query.filter_by(student_id=student.id, course_id=course.id)
        .order_by(StudyProgressItem.item_key.asc())
        .all()
    )

    item_count = len(items)
    if item_count:
        total = sum(item.percent or 0 for item in items)
        overall_percent = int(round(total / item_count))
        last_updated = max((item.updated_at for item in items if item.updated_at), default=None)
    else:
        overall_percent = 0
        last_updated = None

    return jsonify(
        {
            "student_id": student.id,
            "course_id": course.id,
            "item_count": item_count,
            "overall_percent": overall_percent,
            "updated_at": _iso(last_updated),
            "items": [item.to_dict() for item in items],
        }
    )


@bp.route("/study/<int:student_id>/<int:course_id>", methods=["PUT"])
@jwt_required()
def upsert_study_progress(student_id, course_id):
    student = _resolve_student(student_id)
    course = Course.query.get_or_404(course_id)
    _ensure_enrolled(course.id, student.id)

    data = request.get_json(silent=True) or {}
    replace = bool(data.get("replace", False))
    normalized_items = _normalize_items(data.get("items", []))

    existing = {
        item.item_key: item
        for item in StudyProgressItem.query.filter_by(student_id=student.id, course_id=course.id).all()
    }

    touched_keys = set()
    for entry in normalized_items:
        record = existing.get(entry["item_key"])
        if record is None:
            record = StudyProgressItem(
                student_id=student.id,
                course_id=course.id,
                item_key=entry["item_key"],
            )
        record.percent = entry["percent"]
        record.item_type = entry["item_type"]
        record.title = entry["title"]
        if entry["metadata_provided"]:
            record.metadata_dict = entry["metadata"]
        db.session.add(record)
        touched_keys.add(entry["item_key"])

    if replace:
        query = StudyProgressItem.query.filter_by(student_id=student.id, course_id=course.id)
        if touched_keys:
            query = query.filter(~StudyProgressItem.item_key.in_(touched_keys))
        query.delete(synchronize_session=False)

    try:
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        abort(400, description=str(exc))
    except Exception as exc:
        db.session.rollback()
        abort(500, description=str(exc))

    return get_study_progress(student.id, course.id)


@bp.route("/courses/<int:student_id>", methods=["GET"])
@jwt_required()
def list_course_progress(student_id):
    student = _resolve_student(student_id)

    course_ids = request.args.getlist("course_id", type=int)

    query = (
        db.session.query(
            StudyProgressItem.course_id.label("course_id"),
            func.count(StudyProgressItem.id).label("item_count"),
            func.avg(StudyProgressItem.percent).label("avg_percent"),
            func.max(StudyProgressItem.updated_at).label("updated_at"),
            Course.code.label("course_code"),
            Course.name.label("course_name"),
        )
        .join(Course, Course.id == StudyProgressItem.course_id)
        .filter(StudyProgressItem.student_id == student.id)
    )
    if course_ids:
        query = query.filter(StudyProgressItem.course_id.in_(course_ids))

    rows = query.group_by(
        StudyProgressItem.course_id,
        Course.code,
        Course.name,
    ).all()

    results = []
    for row in rows:
        avg = row.avg_percent or 0
        results.append(
            {
                "student_id": student.id,
                "course_id": row.course_id,
                "course_code": row.course_code,
                "course_name": row.course_name,
                "item_count": row.item_count,
                "overall_percent": int(round(avg)),
                "updated_at": _iso(row.updated_at),
            }
        )

    return jsonify(results)


@bp.route("/course/<int:course_id>/students", methods=["GET"])
@jwt_required()
def list_course_student_progress(course_id):
    course = Course.query.get_or_404(course_id)
    teacher = _resolve_teacher(course)

    progress_subq = (
        db.session.query(
            StudyProgressItem.student_id.label("student_id"),
            func.count(StudyProgressItem.id).label("item_count"),
            func.avg(StudyProgressItem.percent).label("avg_percent"),
            func.max(StudyProgressItem.updated_at).label("updated_at"),
        )
        .filter(StudyProgressItem.course_id == course.id)
        .group_by(StudyProgressItem.student_id)
        .subquery()
    )

    rows = (
        db.session.query(
            User.id.label("student_id"),
            User.first_name.label("first_name"),
            User.last_name.label("last_name"),
            User.username.label("username"),
            Enrollment.enrolled_at.label("enrolled_at"),
            progress_subq.c.item_count,
            progress_subq.c.avg_percent,
            progress_subq.c.updated_at,
        )
        .join(Enrollment, Enrollment.user_id == User.id)
        .outerjoin(progress_subq, progress_subq.c.student_id == User.id)
        .filter(Enrollment.course_id == course.id)
        .filter(User.role == UserRole.STUDENT)
        .order_by(User.last_name.asc(), User.first_name.asc(), User.id.asc())
        .all()
    )

    results = []
    for row in rows:
        full_name = " ".join(part for part in [row.first_name, row.last_name] if part).strip()
        avg = row.avg_percent or 0
        results.append(
            {
                "course_id": course.id,
                "course_code": course.code,
                "course_name": course.name,
                "teacher_id": teacher.id,
                "student_id": row.student_id,
                "student_username": row.username,
                "student_first_name": row.first_name,
                "student_last_name": row.last_name,
                "student_full_name": full_name or row.username,
                "item_count": int(row.item_count or 0),
                "overall_percent": int(round(avg)),
                "updated_at": _iso(row.updated_at),
                "enrolled_at": _iso(row.enrolled_at),
            }
        )

    return jsonify(results)
