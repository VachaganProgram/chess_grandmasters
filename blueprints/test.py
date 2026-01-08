from flask import Blueprint,request,jsonify
from database.database import postgres_pool
import bcrypt
import jwt
from datetime import datetime,timedelta,timezone
import os
from utils.security import authenticate_jwt_token

test = Blueprint("test",__name__)

@test.route("/protected")
@authenticate_jwt_token
def protected():
    return jsonify('this route is protected'),200