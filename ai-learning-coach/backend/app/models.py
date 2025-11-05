from datetime import datetime, timezone
import enum
from zoneinfo import ZoneInfo

from .extensions import db

SYDNEY_TZ = ZoneInfo("Australia/Sydney")


def _to_sydney_iso(dt):
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(SYDNEY_TZ).isoformat()


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
    feedback_sent = db.relationship(
        "Feedback",
        back_populates="teacher",
        lazy="selectin",
        foreign_keys="Feedback.teacher_id",
    )
    feedback_received = db.relationship(
        "Feedback",
        back_populates="student",
        lazy="selectin",
        foreign_keys="Feedback.student_id",
    )
    conversations = db.relationship("Conversation", back_populates="user", lazy="selectin")

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
    feedback_entries = db.relationship(
        "Feedback",
        back_populates="course",
        cascade="all, delete-orphan",
        lazy="selectin",
        single_parent=True,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "description": self.description,
            "image_url": self.image_url,
            "created_by": self.created_by,
            "created_at": _to_sydney_iso(self.created_at),
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
    assignment_id = db.Column(db.Integer, db.ForeignKey("assignments.id"), nullable=True)
    stored_name = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    file_size = db.Column(db.Integer)
    # New fields for stronger file management semantics
    file_type = db.Column(
        db.String(50), nullable=True
    )  # e.g. assignment, quiz, lab, lecture_slide, learning_material, practice
    week_number = db.Column(db.Integer, nullable=True)  # 1-based week number within term

    course = db.relationship("Course", back_populates="materials", lazy="joined")
    assignment = db.relationship("Assignment", back_populates="submissions", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "assignment_id": self.assignment_id,
            "stored_name": self.stored_name,
            "original_name": self.original_name,
            "uploaded_at": _to_sydney_iso(self.uploaded_at),
            "uploaded_by": self.uploaded_by,
            "file_size": self.file_size,
            "file_type": self.file_type,
            "week_number": self.week_number,
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
    submissions = db.relationship("Material", back_populates="assignment", lazy="selectin")

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "teacher_id": self.teacher_id,
            "title": self.title,
            "description": self.description,
            "due_date": _to_sydney_iso(self.due_date),
            "optional": bool(self.optional),
            "created_at": _to_sydney_iso(self.created_at),
        }


class Feedback(db.Model):
    __tablename__ = "feedback"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=datetime.now(timezone.utc),
        onupdate=datetime.now(timezone.utc),
    )

    course = db.relationship("Course", back_populates="feedback_entries", lazy="joined")
    teacher = db.relationship(
        "User",
        foreign_keys=[teacher_id],
        back_populates="feedback_sent",
        lazy="joined",
    )
    student = db.relationship(
        "User",
        foreign_keys=[student_id],
        back_populates="feedback_received",
        lazy="joined",
    )

    def to_dict(self, include_related: bool = False):
        data = {
            "id": self.id,
            "course_id": self.course_id,
            "teacher_id": self.teacher_id,
            "student_id": self.student_id,
            "content": self.content,
            "created_at": _to_sydney_iso(self.created_at),
            "updated_at": _to_sydney_iso(self.updated_at),
        }
        if include_related:
            data["teacher"] = (
                {
                    "id": self.teacher.id,
                    "first_name": self.teacher.first_name,
                    "last_name": self.teacher.last_name,
                    "username": self.teacher.username,
                }
                if self.teacher
                else None
            )
            data["student"] = (
                {
                    "id": self.student.id,
                    "first_name": self.student.first_name,
                    "last_name": self.student.last_name,
                    "username": self.student.username,
                }
                if self.student
                else None
            )
            if self.course:
                data["course"] = {
                    "id": self.course.id,
                    "code": self.course.code,
                    "name": self.course.name,
                }
        return data


class Conversation(db.Model):
    __tablename__ = "conversations"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    title = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="conversations", lazy="joined")
    messages = db.relationship(
        "ConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ConversationMessage.created_at",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "created_at": _to_sydney_iso(self.created_at),
            "updated_at": _to_sydney_iso(self.updated_at),
        }


class ConversationMessage(db.Model):
    __tablename__ = "conversation_messages"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("conversations.id"), nullable=False)
    role = db.Column(db.String(16), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    conversation = db.relationship("Conversation", back_populates="messages", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "created_at": _to_sydney_iso(self.created_at),
        }
