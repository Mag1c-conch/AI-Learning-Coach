import os
import sys
from pathlib import Path

import pytest

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from app import create_app
from app.extensions import db


@pytest.fixture()
def app(monkeypatch, tmp_path):
    test_db = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{test_db}")
    monkeypatch.delenv("REDIS_URL", raising=False)

    application = create_app()
    application.config.update(TESTING=True)

    with application.app_context():
        db.drop_all()
        db.create_all()

    yield application

    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def register_user(client, **overrides):
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "username": overrides.get("username", "test_user@example.com"),
        "password": overrides.get("password", "password123"),
        "role": overrides.get("role", "student"),
    }
    payload.update(overrides)
    return client.post("/auth/register", json=payload)


def login_user(client, username, password, role):
    return client.post(
        "/auth/login",
        json={"username": username, "password": password, "role": role},
    )


def test_registration_and_login_flow(client):
    resp = register_user(
        client,
        username="student_tester@example.com",
        role="student",
    )
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["username"] == "student_tester@example.com"
    assert data["role"] == "student"

    duplicate = register_user(
        client,
        username="student_tester@example.com",
        role="student",
    )
    assert duplicate.status_code == 400

    login = login_user(
        client,
        username="student_tester@example.com",
        password="password123",
        role="student",
    )
    assert login.status_code == 201
    login_data = login.get_json()
    assert login_data["username"] == "student_tester@example.com"
    assert login_data["role"] == "student"

    bad_login = login_user(
        client,
        username="student_tester@example.com",
        password="wrong",
        role="student",
    )
    assert bad_login.status_code == 201
    assert bad_login.get_json()["error"] == "Invalid username or password!"


def test_course_creation_and_enrollment(client):
    admin_resp = register_user(
        client,
        username="admin_tester@example.com",
        role="admin",
    )
    assert admin_resp.status_code == 201
    admin_id = admin_resp.get_json()["id"]

    student_resp = register_user(
        client,
        username="learner@example.com",
        role="student",
    )
    assert student_resp.status_code == 201
    student_id = student_resp.get_json()["id"]

    course_payload = {
        "course_name": "AI Fundamentals",
        "course_code": "AI101",
        "description": "Introduction to AI concepts",
        "image_url": "https://example.com/ai101.png",
        "created_by": admin_id,
    }
    course_resp = client.post("/courses", json=course_payload)
    assert course_resp.status_code == 201
    course_data = course_resp.get_json()
    assert course_data["code"] == "AI101"
    course_id = course_data["id"]

    enroll_resp = client.post(
        f"/courses/{course_id}/enroll",
        json={"student_id": student_id},
    )
    assert enroll_resp.status_code == 201

    duplicate_enroll = client.post(
        f"/courses/{course_id}/enroll",
        json={"student_id": student_id},
    )
    assert duplicate_enroll.status_code == 409

    courses_list = client.get("/courses")
    assert courses_list.status_code == 200
    courses = courses_list.get_json()
    assert any(course["code"] == "AI101" for course in courses)

    enrollments_resp = client.get(f"/courses/users/{student_id}/enrollments")
    assert enrollments_resp.status_code == 200
    enrollment_courses = enrollments_resp.get_json()
    assert any(course["code"] == "AI101" for course in enrollment_courses)
