# app/routes/auth.py
import re
from flask import Blueprint, request, jsonify
from ..models import User
from ..extensions import db

bp=Blueprint('auth', __name__, url_prefix='/auth')

@bp.route('/register',methods=['POST'])
def register():
    #TODO: Add user to database
    data=request.json
    first_name=data.get('first_name')
    last_name=data.get('last_name')
    username=data.get('username')
    password=data.get('password')
    role=data.get('role')
    Pattern = re.compile(r'^[a-zA-Z0-9_-]{4,16}$')
    result = Pattern.match(username)
    if not result:
        return jsonify({
            "error": "The username is invalid!"
        }), 201
    Pattern = re.compile(r'^[a-zA-Z0-9_-]{6,16}$')
    result = Pattern.match(password)
    if not result:
        return jsonify({
            "error": "The password is invalid!"
        }), 201
    exist_user = User.query.filter_by(username=username, role = role).first()
    if exist_user:
        return jsonify({
            "error": "The username has been registered!"
        }), 201
    user = User()
    user.first_name = first_name
    user.last_name = last_name
    user.password = password
    user.username = username
    user.role = role
    db.session.add(user)
    db.session.flush()
    db.session.refresh(user)
    db.session.commit()
    return jsonify({
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "role": role,
        "id": user.id
    }), 201

@bp.route('/login',methods=['POST'])
def login():
    data=request.json
    username=data.get('username')
    role=data.get('role')
    password=data.get('password')
    Pattern = re.compile(r'^[a-zA-Z0-9_-]{4,16}$')
    result = Pattern.match(username)
    if not result:
        return jsonify({
            "error": "The username is invalid!"
        }), 201
    Pattern = re.compile(r'^[a-zA-Z0-9_-]{6,16}$')
    result = Pattern.match(password)
    if not result:
        return jsonify({
            "error": "The password is invalid!"
        }), 201
    user = User.query.filter_by(username=username, password=password, role = role).first()
    if user:
        return jsonify({
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": username,
            "role": user.role,
            "id": user.id
        }), 201
    else:
        return jsonify({
            "error": 'Invalid username or password!'
        }), 201