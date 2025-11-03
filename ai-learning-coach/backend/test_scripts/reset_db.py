"""Utility script to rebuild the local database and seed sample data."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import shutil
import sys

from flask import current_app

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from app import create_app
from app.extensions import db
from app.models import Assignment, Course, Enrollment, Material, User, UserRole


def _write_placeholder_file(path: Path, contents: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8")


def seed_data() -> None:
    """Insert demonstration rows after tables have been recreated."""
    upload_root = Path(current_app.config["UPLOAD_FOLDER"])
    upload_root.mkdir(parents=True, exist_ok=True)

    teacher = User(
        username="admin",
        password="admin123",
        first_name="Alice",
        last_name="Admin",
        role=UserRole.ADMIN,
    )
    student_1 = User(
        username="student1",
        password="student123",
        first_name="Bob",
        last_name="Student",
        role=UserRole.STUDENT,
    )
    student_2 = User(
        username="student2",
        password="student456",
        first_name="Cathy",
        last_name="Learner",
        role=UserRole.STUDENT,
    )
    course = Course(
        code="COMP9900",
        name="Capstone Project",
        description="Final-year capstone course covering full-stack delivery.",
        image_url="https://example.com/images/comp9900.png",
        creator=teacher,
    )

    db.session.add_all([teacher, student_1, student_2, course])
    db.session.flush()

    enrollments = [
        Enrollment(user_id=student_1.id, course_id=course.id),
        Enrollment(user_id=student_2.id, course_id=course.id),
    ]

    assignment = Assignment(
        course_id=course.id,
        teacher_id=teacher.id,
        title="Project Proposal",
        description="Submit a project proposal outlining scope and milestones.",
        due_date=datetime.now(timezone.utc) + timedelta(days=14),
        optional=False,
    )

    db.session.add_all(enrollments + [assignment])
    db.session.flush()

    course_dir = upload_root / str(course.id)
    course_dir.mkdir(parents=True, exist_ok=True)

    # Seed a teacher-uploaded lecture slide
    lecture_name = "week1_intro.pdf"
    lecture_path = course_dir / lecture_name
    _write_placeholder_file(lecture_path, "Week 1 introduction content")

    lecture_material = Material(
        course_id=course.id,
        stored_name=lecture_name,
        original_name="Week 1 Introduction.pdf",
        uploaded_by=teacher.id,
        file_size=lecture_path.stat().st_size,
        file_type="lecture_slide",
        week_number=1,
    )

    # Seed a submission for student_1
    assignment_dir = course_dir / str(assignment.id)
    submission_name = f"{student_1.id}.pdf"
    submission_path = assignment_dir / submission_name
    _write_placeholder_file(submission_path, "Student 1 proposal content")

    submission_material = Material(
        course_id=course.id,
        assignment_id=assignment.id,
        stored_name=submission_name,
        original_name="proposal.pdf",
        uploaded_by=student_1.id,
        file_size=submission_path.stat().st_size,
        file_type="assignment_submission",
    )

    db.session.add_all([lecture_material, submission_material])
    db.session.commit()


def reset_database() -> None:
    """Drop all tables, recreate them, and seed initial data."""
    app = create_app()
    with app.app_context():
        upload_root = Path(current_app.config["UPLOAD_FOLDER"])
        if upload_root.exists():
            shutil.rmtree(upload_root)

        print("Dropping existing tables...")
        db.drop_all()
        print("Creating tables...")
        db.create_all()
        print("Seeding initial data...")
        seed_data()
        print(f"Database reset complete. Seed files stored under {upload_root}")


if __name__ == "__main__":
    reset_database()
