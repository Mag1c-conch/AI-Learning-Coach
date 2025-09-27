# app/routes/auth.py
from flask import Blueprint, request, jsonify

bp=Blueprint('auth', __name__, url_prefix='/auth')

@bp.route('/register',methods=['POST'])
def register():
    #TODO: Add user to database
    data=request.json
    first_name=data.get('first_name')
    last_name=data.get('last_name')
    username=data.get('username')
    password=data.get('password')
    return jsonify({
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "password": password
    }), 201