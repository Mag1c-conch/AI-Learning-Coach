"""Utility script to rebuild the local database and seed baseline accounts."""
from pathlib import Path
import shutil
import sys
from typing import Optional
from urllib.parse import urlparse

from flask import current_app, json

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from app import create_app
from app.extensions import db
from app.models import User, UserRole


SEED_USERS = [
    {
        "username": "admin",
        "password": "admin123",
        "first_name": "Alice",
        "last_name": "Admin",
        "role": UserRole.ADMIN,
    },
    {
        "username": "admin2",
        "password": "admin123",
        "first_name": "Eve",
        "last_name": "Instructor",
        "role": UserRole.ADMIN,
    },
    {
        "username": "student1",
        "password": "student123",
        "first_name": "Bob",
        "last_name": "Student",
        "role": UserRole.STUDENT,
    },
    {
        "username": "student2",
        "password": "student123",
        "first_name": "Cathy",
        "last_name": "Learner",
        "role": UserRole.STUDENT,
    },
    {
        "username": "student3",
        "password": "student123",
        "first_name": "David",
        "last_name": "Analyst",
        "role": UserRole.STUDENT,
    },
]


def _resolve_sqlite_path(database_uri: str) -> Optional[Path]:
    """Return a filesystem Path for sqlite:// URIs or None for other engines."""
    if not database_uri:
        return None
    parsed = urlparse(database_uri)
    if parsed.scheme != "sqlite":
        return None

    # sqlite:///:memory: should not be removed
    if parsed.path in {":memory:", "/:memory:"}:
        return None

    path_str = database_uri.replace("sqlite:///", "", 1)
    # Handle Windows drive letters that may start with an extra slash
    if len(path_str) >= 3 and path_str[0] == "/" and path_str[2] == ":":
        path_str = path_str[1:]
    return Path(path_str).expanduser().resolve()


def seed_users() -> None:
    """Insert baseline admin and student users after tables have been recreated."""
    for user_data in SEED_USERS:
        user = User(**user_data)
        db.session.add(user)
    db.session.commit()
    print(f"Seeded users: {json.dumps([u['username'] for u in SEED_USERS])}")


def reset_database() -> None:
    """Drop all tables, recreate them, and seed initial data."""
    app = create_app()
    with app.app_context():
        upload_root = Path(current_app.config["UPLOAD_FOLDER"])
        db_uri = current_app.config.get("SQLALCHEMY_DATABASE_URI", "")
        sqlite_path = _resolve_sqlite_path(db_uri)

        # Ensure connections are closed before trying to remove files on Windows.
        db.session.remove()
        db.engine.dispose()

        if sqlite_path and sqlite_path.exists():
            print(f"Removing existing database file: {sqlite_path}")
            sqlite_path.unlink()
        elif sqlite_path:
            sqlite_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            print("Non-sqlite database detected; falling back to dropping tables.")
            db.drop_all()

        if upload_root.exists():
            print(f"Removing upload directory: {upload_root}")
            shutil.rmtree(upload_root)

        upload_root.mkdir(parents=True, exist_ok=True)

        print("Creating tables from models...")
        db.create_all()
        print("Seeding baseline user accounts...")
        seed_users()
        print("Database reset complete.")
        if upload_root.exists():
            print(f"Upload directory ready at: {upload_root}")
        if sqlite_path:
            print(f"New database located at: {sqlite_path}")


if __name__ == "__main__":
    reset_database()
