import json
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from app.extensions import db
from app.models import (
    Assignment,
    Course,
    Enrollment,
    Material,
    StudyPlan,
    SYDNEY_TZ,
    User,
    UserRole,
)

from .test_auth_course_flow import app, client


@pytest.fixture()
def seeded_course(app):
    with app.app_context():
        teacher = User(
            username="teacher@example.com",
            password="password123",
            first_name="Teach",
            last_name="Er",
            role=UserRole.ADMIN,
        )
        student = User(
            username="student@example.com",
            password="password123",
            first_name="Stu",
            last_name="Dent",
            role=UserRole.STUDENT,
        )
        db.session.add_all([teacher, student])
        db.session.flush()

        course = Course(
            code="COMP101",
            name="Intro to Comp",
            description="Foundational computing concepts.",
            created_by=teacher.id,
        )
        db.session.add(course)
        db.session.flush()

        enrollment = Enrollment(user_id=student.id, course_id=course.id)
        db.session.add(enrollment)

        assignment = Assignment(
            course_id=course.id,
            teacher_id=teacher.id,
            title="Week 1 Quiz",
            description="Covers lecture topics.",
            due_date=datetime.now(SYDNEY_TZ) + timedelta(days=5),
        )
        db.session.add(assignment)
        db.session.flush()

        stored_name = "week1-notes.txt"
        material = Material(
            course_id=course.id,
            assignment_id=None,
            stored_name=stored_name,
            original_name="Week 1 Notes",
            uploaded_by=teacher.id,
            file_type="lecture_note",
            week_number=1,
        )
        db.session.add(material)
        db.session.commit()

        upload_root = Path(app.config["UPLOAD_FOLDER"]) / str(course.id)
        upload_root.mkdir(parents=True, exist_ok=True)
        (upload_root / stored_name).write_text("Key concepts for week 1.", encoding="utf-8")

        return {
            "teacher_id": teacher.id,
            "student_id": student.id,
            "course_id": course.id,
            "assignment_id": assignment.id,
            "material_id": material.id,
        }


def _make_ai_payload(student_id, course_id, material_id):
    week_start = datetime.now(SYDNEY_TZ).date()
    days = []
    for offset in range(7):
        day = week_start + timedelta(days=offset)
        days.append(
            {
                "date": day.isoformat(),
                "tasks": [
                    {
                        "title": "Review material",
                        "description": "Study and make notes.",
                        "course_id": course_id,
                        "material_id": material_id,
                        "start_time": "09:00",
                        "end_time": "10:30",
                    }
                ],
            }
        )
    return json.dumps(
        {
            "student_id": student_id,
            "week_start": week_start.isoformat(),
            "week_end": (week_start + timedelta(days=6)).isoformat(),
            "days": days,
        }
    )


def test_generate_study_plan_stores_plan(app, client, monkeypatch, seeded_course):
    payload = _make_ai_payload(
        seeded_course["student_id"],
        seeded_course["course_id"],
        seeded_course["material_id"],
    )

    monkeypatch.setattr("app.routes.ai_assistant.generate_reply", lambda *args, **kwargs: payload)

    response = client.post("/get_plan", json={"student_id": seeded_course["student_id"]})
    assert response.status_code == 200
    data = response.get_json()
    plan = data["plan"]

    assert plan["student_id"] == seeded_course["student_id"]
    assert len(plan["days"]) == 7
    assert all(day["tasks"] for day in plan["days"])
    assert plan["metadata"]["source"] == "ai"

    fetch = client.get(f"/assistant/study_plan/{seeded_course['student_id']}")
    assert fetch.status_code == 200
    fetched_plan = fetch.get_json()["plan"]
    assert fetched_plan["student_id"] == plan["student_id"]
    assert fetched_plan["metadata"]["source"] == "ai"

    with app.app_context():
        stored_plan = StudyPlan.query.filter_by(student_id=seeded_course["student_id"]).first()
        assert stored_plan is not None
        assert stored_plan.plan["metadata"]["source"] == "ai"
        assert len(stored_plan.plan["days"]) == 7


def test_generate_study_plan_fallback_when_ai_invalid(app, client, monkeypatch, seeded_course):
    monkeypatch.setattr("app.routes.ai_assistant.generate_reply", lambda *args, **kwargs: "not-json")

    response = client.post("/get_plan", json={"student_id": seeded_course["student_id"]})
    assert response.status_code == 200
    data = response.get_json()
    plan = data["plan"]
    assert plan["metadata"]["source"] == "fallback"
    assert any(day["tasks"] for day in plan["days"])

    week_start = plan["week_start"]
    fetch = client.get(
        f"/assistant/study_plan/{seeded_course['student_id']}?week_start={week_start}"
    )
    assert fetch.status_code == 200
    fetched_plan = fetch.get_json()["plan"]
    assert fetched_plan["metadata"]["source"] == "fallback"
