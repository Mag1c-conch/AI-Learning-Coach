from datetime import datetime, timezone
from pathlib import Path

from app.extensions import db
from app.models import Assignment, Course, Enrollment, Material, User, UserRole

from .test_auth_course_flow import app, client


def _seed_materials(app, *, include_submission: bool = True):
    with app.app_context():
        admin = User(
            username="admin_material@example.com",
            password="secret",
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
        )
        student = User(
            username="student_material@example.com",
            password="secret",
            first_name="Student",
            last_name="User",
            role=UserRole.STUDENT,
        )
        db.session.add_all([admin, student])
        db.session.flush()

        course = Course(
            code="MATS101",
            name="Material Science",
            description="Testing materials route.",
            created_by=admin.id,
        )
        db.session.add(course)
        db.session.flush()

        enrollment = Enrollment(user_id=student.id, course_id=course.id)
        db.session.add(enrollment)

        assignment = Assignment(
            course_id=course.id,
            teacher_id=admin.id,
            title="Reading Task",
            description="Read the provided chapter.",
            due_date=datetime(2025, 1, 1, tzinfo=timezone.utc),
        )
        db.session.add(assignment)
        db.session.flush()

        lecture = Material(
            course_id=course.id,
            assignment_id=None,
            stored_name="chapter1.pdf",
            original_name="Chapter 1",
            uploaded_by=admin.id,
            file_type="lecture_slide",
            week_number=1,
        )
        db.session.add(lecture)

        submission = None
        if include_submission:
            submission = Material(
                course_id=course.id,
                assignment_id=assignment.id,
                stored_name="submission.txt",
                original_name="Submission",
                uploaded_by=student.id,
                file_type="assignment_submission",
            )
            db.session.add(submission)

        db.session.commit()

        return {
            "admin_id": admin.id,
            "student_id": student.id,
            "course_id": course.id,
            "assignment_id": assignment.id,
            "lecture_id": lecture.id,
            "submission_id": submission.id if submission else None,
            "lecture_name": lecture.stored_name,
        }


def test_list_materials_includes_assignments_when_requested(app, client):
    seed = _seed_materials(app, include_submission=True)

    resp = client.get("/materials", query_string={"course_id": seed["course_id"]})
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data) == 1
    assert data[0]["id"] == seed["lecture_id"]

    resp = client.get(
        "/materials",
        query_string={"course_id": seed["course_id"], "include_submissions": "true"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data) == 2

    submission = next(item for item in data if item["id"] == seed["submission_id"])
    assert submission["assignment"]["id"] == seed["assignment_id"]
    assert submission["assignment"]["due_date"].endswith("Z")


def test_delete_material_requires_admin_and_removes_file(app, client):
    seed = _seed_materials(app, include_submission=False)
    upload_dir = Path(app.config["UPLOAD_FOLDER"]) / str(seed["course_id"])
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / seed["lecture_name"]
    file_path.write_text("lecture content", encoding="utf-8")

    resp = client.delete(
        f"/materials/{seed['lecture_id']}",
        query_string={"deleted_by": seed["student_id"]},
    )
    assert resp.status_code == 403

    resp = client.delete(
        f"/materials/{seed['lecture_id']}",
        query_string={"deleted_by": seed["admin_id"]},
    )
    assert resp.status_code == 200
    assert resp.get_json()["material_id"] == seed["lecture_id"]
    assert not file_path.exists()

    with app.app_context():
        assert Material.query.get(seed["lecture_id"]) is None
