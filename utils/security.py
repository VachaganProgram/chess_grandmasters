from functools import wraps
from flask import Flask , jsonify , request, g
import os
from dotenv import load_dotenv
import jwt

def authenticate_jwt_token(f):
    @wraps(f)
    def wrapper(*args,**kwargs):
        auth = request.headers.get('Authorization','')
        if not auth.startswith('Bearer '):
            return jsonify(error="no token specified or wrong format"),400
        
        token = auth.split(' ',1)[1]  

        try:
            token_payload = jwt.decode(
                token,
                os.getenv("JWT_SECRET_TOKEN"),
                algorithms=["HS256"]
            )
        
            g.user = token_payload

        except jwt.ExpiredSignatureError:
            return jsonify(error='token expirered'),401
        except jwt.InvalidTokenError:
            return jsonify(error='invalid token'),401
        
        return f(*args,**kwargs)
    return wrapper