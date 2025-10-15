# app/routes/auth.py
from flask import Blueprint, request, jsonify
from ..models import User, UserRole
from ..extensions import db

bp=Blueprint('auth', __name__, url_prefix='/auth')

@bp.route('/register',methods=['POST'])
def register():
    try:
        data=request.json
        
        # Validate required fields
        first_name=data.get('first_name')
        last_name=data.get('last_name')
        username=data.get('username')
        password=data.get('password')
        role_str=data.get('role')
        
        # Check for missing fields
        missing_fields = []
        if not first_name:
            missing_fields.append('first_name')
        if not last_name:
            missing_fields.append('last_name')
        if not username:
            missing_fields.append('username')
        if not password:
            missing_fields.append('password')
        if not role_str:
            missing_fields.append('role')
            
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        # Convert string role to UserRole enum
        if role_str == 'student':
            role_enum = UserRole.STUDENT
        elif role_str == 'admin':
            role_enum = UserRole.ADMIN
        else:
            return jsonify({
                "error": 'Invalid role! Must be either "student" or "admin".'
            }), 400
        
        # Check if the email is already registered with the same role
        exist_user = User.query.filter_by(username=username, role=role_enum).first()
        if exist_user:
            role_name = "student" if role_enum == UserRole.STUDENT else "admin"
            return jsonify({
                "error": f"This email is already registered as a {role_name}. Please use a different email or sign in."
            }), 400
        
        user = User()
        user.first_name = first_name
        user.last_name = last_name
        user.password = password
        user.username = username
        user.role = role_enum
        db.session.add(user)
        db.session.flush()
        db.session.refresh(user)
        db.session.commit()
        return jsonify({
            "first_name": first_name,
            "last_name": last_name,
            "username": username,
            "role": role_enum.value,
            "id": user.id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": f"Registration failed: {str(e)}"
        }), 500

@bp.route('/login',methods=['POST'])
def login():
    data=request.json
    username=data.get('username')
    role_str=data.get('role')
    password=data.get('password')
    
    # Convert string role to UserRole enum
    if role_str == 'student':
        role_enum = UserRole.STUDENT
    elif role_str == 'admin':
        role_enum = UserRole.ADMIN
    else:
        return jsonify({
            "error": 'Invalid role!'
        }), 400
    
    user = User.query.filter_by(username=username, password=password, role=role_enum).first()
    if user:
        return jsonify({
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": username,
            "role": user.role.value,  # Return string value instead of enum
            "id": user.id
        }), 201
    else:
        return jsonify({
            "error": 'Invalid username or password!'
        }), 201