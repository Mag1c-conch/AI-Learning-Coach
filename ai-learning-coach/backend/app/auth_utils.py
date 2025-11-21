"""Helpers for JWT-based authentication and current-user resolution."""
from __future__ import annotations

from typing import Optional

from flask import abort
from flask_jwt_extended import create_access_token, get_jwt_identity

from .models import User, UserRole


def create_user_access_token(user: User) -> str:
    claims = {
        "role": user.role.value if isinstance(user.role, UserRole) else str(user.role),
    }
    return create_access_token(identity=str(user.id), additional_claims=claims)


def current_user_from_token(optional: bool = False) -> Optional[User]:
    identity = get_jwt_identity()
    if not identity:
        if optional:
            return None
        abort(401, description="authentication required")

    if isinstance(identity, dict):
        user_id = identity.get("id")
    else:
        try:
            user_id = int(identity)
        except (TypeError, ValueError):
            user_id = None
    if not user_id:
        if optional:
            return None
        abort(401, description="invalid token identity")

    user = User.query.get(user_id)
    if not user:
        if optional:
            return None
        abort(401, description="user not found")
    return user


def require_role(user: User, role: UserRole) -> None:
    if not isinstance(user.role, UserRole):
        abort(403, description="invalid user role")
    if user.role != role:
        abort(403, description="insufficient permissions")


def resolve_user(
    provided_user_id: Optional[int],
    *,
    allow_token: bool = True,
    required_role: Optional[UserRole] = None,
    require: bool = True,
) -> Optional[User]:
    user: Optional[User] = None
    if provided_user_id is not None:
        user = User.query.get(provided_user_id)
        if not user:
            abort(404, description="user not found")
    elif allow_token:
        user = current_user_from_token(optional=not require)

    if not user:
        if require:
            abort(401, description="authentication required")
        return None

    if required_role is not None:
        require_role(user, required_role)
    return user
