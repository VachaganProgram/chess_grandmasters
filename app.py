from flask import Flask, render_template, redirect, url_for, session, request
from flask_cors import CORS
from blueprints.auth import auth
from blueprints.masters import masters
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

CORS(app)

app.secret_key = os.getenv("SECRET_KEY")

app.register_blueprint(auth, url_prefix="/api/v1/auth")
app.register_blueprint(masters, url_prefix="/api/v1/masters")

@app.route("/")
def root():
    return redirect(url_for("login_page"))

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/register")
def register_page():
    return render_template("register.html")

@app.route("/admin")
def admin_page():
    role = session.get("role") or request.cookies.get("role")
    if role != "admin":
        return redirect(url_for("guest_page"))
    return render_template("admin.html")

@app.route("/guest")
def guest_page():
    return render_template("guest.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
