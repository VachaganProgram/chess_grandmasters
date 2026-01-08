from flask import Flask, Blueprint, request, jsonify
from database.database import postgres_pool
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_TOKEN")

ADMIN_USERNAMES = os.getenv("ADMIN_SECRET_usernames", "").split(',')
ADMIN_USERNAMES = [name.strip() for name in ADMIN_USERNAMES if name.strip()]
print(f"🔑 Admin usernames loaded: {ADMIN_USERNAMES}")

auth = Blueprint("auth", __name__)

@app.route('/')
def index():
    return "Welcome to Chess Masters!"

@auth.route("/register", methods=["POST"])
def register():
    postgres = postgres_pool.getconn()
    cursor = postgres.cursor()
    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        role = 'admin' if username in ADMIN_USERNAMES else 'guest'

        cursor.execute("SELECT username FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            return jsonify({"error": "Username already exists"}), 409

        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        cursor.execute(
            "INSERT INTO users (username, password, role) VALUES (%s, %s, %s) RETURNING id, username, role;",
            (username, hashed_password, role)
        )
        postgres.commit()
        response = cursor.fetchone()
        
        print(f"✅ Registered: {response[1]} (role: {response[2]})")
        
        return jsonify({
            "message": f"User '{response[1]}' registered successfully",
            "user_id": response[0],
            "username": response[1],
            "role": response[2]
        }), 201
        
    except Exception as e:
        postgres.rollback()
        print("❌ Registration error:", e)
        if "duplicate key" in str(e) or "unique constraint" in str(e):
            return jsonify({"error": "Username already exists"}), 409
        if os.getenv("PYTHON_ENV") == "DEV":
            return jsonify({"error": str(e)}), 500
        else:
            return jsonify({"error": "Registration failed"}), 500
    finally:
        cursor.close()
        postgres_pool.putconn(postgres)

@auth.route("/login", methods=["POST"])
def login():
    postgres = postgres_pool.getconn()
    cursor = postgres.cursor()
    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        print(f"🔵 Login attempt: '{username}'")

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        cursor.execute(
            "SELECT id, username, password, role FROM users WHERE username = %s",
            (username,)
        )

        response = cursor.fetchone()
        
        if not response:
            print(f"❌ User '{username}' not found")
            return jsonify({"error": "Invalid username or password"}), 401

        user_id, db_username, db_password, user_role = response

        print(f"✅ User found: '{db_username}' (role: {user_role})")

        if not bcrypt.checkpw(password.encode('utf-8'), db_password.encode("utf-8")):
            print(f"❌ Wrong password")
            return jsonify({"error": "Invalid username or password"}), 401

        print(f"✅ Login successful!")

        payload = {
            "user_id": user_id,
            "username": db_username,
            "role": user_role,
            "exp": datetime.now(timezone.utc) + timedelta(days=30)
        }
        token = jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm="HS256")

        return jsonify({
            "token": token,
            "username": db_username,
            "role": user_role,
            "message": f"Welcome back, {db_username}!"
        }), 200

    except Exception as e:
        postgres.rollback()
        print(f"❌ Login error: {e}")
        if os.getenv("PYTHON_ENV") == "DEV":
            return jsonify({"error": str(e)}), 500
        else:
            return jsonify({"error": "Login failed"}), 500
    finally:
        cursor.close()
        postgres_pool.putconn(postgres)

app.register_blueprint(auth, url_prefix='/api/v1/auth')

if __name__ == "__main__":
    app.run(debug=True)