"""Utility script to rebuild the local database and seed sample data."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from app import create_app
from app.extensions import db
from app.models import Assignment, Course, Enrollment, Material, User, UserRole


def seed_data() -> None:
    """Insert demonstration rows after tables have been recreated."""
    admin = User(
        username="admin",
        password="admin123",
        first_name="Alice",
        last_name="Admin",
        role=UserRole.ADMIN,
    )
    student = User(
        username="student",
        password="student123",
        first_name="Bob",
        last_name="Student",
        role=UserRole.STUDENT,
    )
    course = Course(
        code="COMP9900",
        name="Capstone Project",
        description="Final-year capstone course covering full-stack delivery.",
        image_url="https://example.com/images/comp9900.png",
        creator=admin,
    )

    # Persist users and course first so they receive primary keys.
    db.session.add_all([admin, student, course])
    db.session.flush()

    enrollment = Enrollment(student_id=student.id, course_id=course.id)
    assignment = Assignment(
        course_id=course.id,
        teacher_id=admin.id,
        title="Project Proposal",
        description="Submit project proposal and project plan.",
        due_date=datetime.now(timezone.utc) + timedelta(days=14),
        optional=False,
    )
    material = Material(
        course_id=course.id,
        stored_name="week1_intro.pdf",
        original_name="Week 1 Introduction.pdf",
        uploaded_by=admin.id,
        file_size=123456,
        file_type="lecture_slide",
        week_number=1,
    )

    db.session.add_all([enrollment, assignment, material])
    db.session.commit()


def reset_database() -> None:
    """Drop all tables, recreate them, and seed initial data."""
    app = create_app()
    with app.app_context():
        print("Dropping existing tables...")
        db.drop_all()
        print("Creating tables...")
        db.create_all()
        print("Seeding initial data...")
        seed_data()
        print("Database reset complete.")


if __name__ == "__main__":
    reset_database()
