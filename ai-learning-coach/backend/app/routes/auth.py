from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from werkzeug.security import generate_password_hash, check_password_hash

from ..auth_utils import create_user_access_token, current_user_from_token
from ..models import User, UserRole
from ..extensions import db

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json(silent=True) or {}

        first_name = data.get("first_name")
        last_name = data.get("last_name")
        username = data.get("username")
        password = data.get("password")
        role_str = data.get("role")

        missing_fields = [
            field
            for field, value in [
                ("first_name", first_name),
                ("last_name", last_name),
                ("username", username),
                ("password", password),
                ("role", role_str),
            ]
            if not value
        ]
        if missing_fields:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

        try:
            if role_str == "student":
                role_enum = UserRole.STUDENT
            elif role_str == "admin":
                role_enum = UserRole.ADMIN
            else:
                raise ValueError("Invalid role! Must be either 'student' or 'admin'.")
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        exist_user = User.query.filter_by(username=username, role=role_enum).first()
        if exist_user:
            role_name = "student" if role_enum == UserRole.STUDENT else "admin"
            return jsonify(
                {
                    "error": f"This email is already registered as a {role_name}. Please use a different email or sign in."
                }
            ), 400

        hashed = generate_password_hash(password)
        user = User(
            first_name=first_name,
            last_name=last_name,
            username=username,
            password=hashed,
            role=role_enum,
        )
        db.session.add(user)
        db.session.commit()

        serialized = {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "role": user.role.value if isinstance(user.role, UserRole) else str(user.role),
        }
        token = create_user_access_token(user)
        response_payload = {"token": token, "user": serialized, **serialized}
        return jsonify(response_payload), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    role_str = data.get("role")
    password = data.get("password")

    if not all([username, role_str, password]):
        return jsonify({"error": "username, role, and password are required"}), 400

    try:
        if role_str == "student":
            role_enum = UserRole.STUDENT
        elif role_str == "admin":
            role_enum = UserRole.ADMIN
        else:
            raise ValueError("Invalid role! Must be either 'student' or 'admin'.")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    user = User.query.filter_by(username=username, role=role_enum).first()
    is_valid = False
    if user:
        if user.password:
            if user.password.startswith("pbkdf2:") or user.password.startswith("scrypt:"):
                is_valid = check_password_hash(user.password, password)
            else:
                is_valid = user.password == password
    if not is_valid:
        return jsonify({"error": "Invalid username or password!"}), 401

    serialized = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "role": user.role.value if isinstance(user.role, UserRole) else str(user.role),
    }
    token = create_user_access_token(user)
    response_payload = {"token": token, "user": serialized, **serialized}
    return jsonify(response_payload), 200


@bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = current_user_from_token()
    payload = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "role": user.role.value if isinstance(user.role, UserRole) else str(user.role),
    }
    return jsonify(payload), 200
