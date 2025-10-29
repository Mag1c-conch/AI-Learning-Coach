from datetime import datetime, timezone
import enum

from .extensions import db

class UserRole(enum.Enum):
    ADMIN = "admin"
    STUDENT = "student"


# User Table
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    password = db.Column(db.String(120), nullable=False)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    # Relationships
    courses_created = db.relationship("Course", back_populates="creator", lazy="selectin")
    enrollments = db.relationship("Enrollment", back_populates="student", lazy="selectin")
    assignments_created = db.relationship(
        "Assignment",
        back_populates="teacher",
        lazy="selectin",
        foreign_keys="Assignment.teacher_id",
    )

    #  Unique constraint on (username, role)
    __table_args__ = (
        db.UniqueConstraint("username", "role", name="uq_user_username_role"),
    )


# Course Table
class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    creator = db.relationship("User", back_populates="courses_created", lazy="joined")
    enrollments = db.relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    assignments = db.relationship("Assignment", back_populates="course", cascade="all, delete-orphan", lazy="selectin")
    materials = db.relationship("Material", back_populates="course", cascade="all, delete-orphan", lazy="selectin")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "description": self.description,
            "image_url": self.image_url,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# Enrollment Table
class Enrollment(db.Model):
    __tablename__ = "enrollments"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    student = db.relationship("User", back_populates="enrollments", lazy="joined")
    course = db.relationship("Course", back_populates="enrollments", lazy="joined")

    __table_args__ = (
        db.UniqueConstraint("user_id", "course_id", name="uq_enrollment_user_course"),
    )


# Material Table
class Material(db.Model):
    __tablename__ = "materials"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    stored_name = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    file_size = db.Column(db.Integer)

    course = db.relationship("Course", back_populates="materials", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "stored_name": self.stored_name,
            "original_name": self.original_name,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "uploaded_by": self.uploaded_by,
            "file_size": self.file_size,
        }


class Assignment(db.Model):
    __tablename__ = "assignments"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    optional = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    course = db.relationship("Course", back_populates="assignments", lazy="joined")
    teacher = db.relationship("User", back_populates="assignments_created", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "teacher_id": self.teacher_id,
            "title": self.title,
            "description": self.description,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "optional": bool(self.optional),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
