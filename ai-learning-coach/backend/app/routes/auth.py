# app/routes/auth.py
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
    exist_user = User.query.filter_by(username=username).first()
    if exist_user:
        return jsonify({
            "error": "The username has been registered!"
        }), 201
    user = User()
    user.first_name = first_name
    user.last_name = last_name
    user.password = password
    user.username = username
    db.session.add(user)
    db.session.flush()
    db.session.refresh(user)
    db.session.commit()
    return jsonify({
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "id": user.id
    }), 201

@bp.route('/login',methods=['POST'])
def login():
    data=request.json
    username=data.get('username')
    password=data.get('password')
    user = User.query.filter_by(username=username, password=password).first()
    if user:
        return jsonify({
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": username,
            "id": user.id
        }), 201
    else:
        return jsonify({
            "error": 'Invalid username or password!'
        }), 201