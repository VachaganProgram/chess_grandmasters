from flask import Blueprint, request, jsonify, g
from psycopg2.extras import RealDictCursor
from database.database import postgres_pool
from utils.security import authenticate_jwt_token
import os

masters = Blueprint("masters", __name__)

@masters.route("/get", methods=["GET"])
@authenticate_jwt_token
def get_masters():
    postgres = postgres_pool.getconn()
    cursor = postgres.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT 
                id,
                name,
                title_years,
                birth_year,
                death_year,
                nationality,
                favorite_piece
            FROM masters;
        """)
        return jsonify(data=cursor.fetchall()), 200

    except Exception as e:
        postgres.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        postgres_pool.putconn(postgres)


@masters.route("/get/master/<int:id>", methods=["GET"])
@authenticate_jwt_token
def read_master(id):
    postgres = postgres_pool.getconn()
    cursor = postgres.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT * FROM masters WHERE id = %s;", (id,))
        master = cursor.fetchone()

        if not master:
            return jsonify({"error": "Master not found"}), 404

        return jsonify(data=master), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        postgres_pool.putconn(postgres)


@masters.route("/list/users/masters", methods=["GET"])
@authenticate_jwt_token
def list_users_masters():
    if g.user["role"] != "admin":
        return jsonify({"error": "Admin only"}), 403

    postgres = postgres_pool.getconn()
    cursor = postgres.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT 
                users.id AS user_id,
                users.username,
                masters.id AS master_id,
                masters.name AS master_name
            FROM users
            LEFT JOIN masters_users ON users.id = masters_users.user_id
            LEFT JOIN masters ON masters.id = masters_users.master_id
            ORDER BY users.username;
        """)
        return jsonify(data=cursor.fetchall()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        postgres_pool.putconn(postgres)

@masters.route("/attach/master/<int:id>", methods=["POST"])
@authenticate_jwt_token
def attach_master_to_user(id):
    if g.user["role"] != "admin":
        return jsonify({"error": "Admin only"}), 403

    data = request.get_json()
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    postgres = postgres_pool.getconn()
    cursor = postgres.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT id FROM users WHERE id = %s;", (user_id,))
        if not cursor.fetchone():
            return jsonify({"error": "User not found"}), 404

        cursor.execute("SELECT id FROM masters WHERE id = %s;", (id,))
        if not cursor.fetchone():
            return jsonify({"error": "Master not found"}), 404

        cursor.execute("""
            INSERT INTO masters_users (user_id, master_id)
            VALUES (%s, %s);
        """, (user_id, id))

        postgres.commit()
        return jsonify({"message": "Attached"}), 200

    except Exception as e:
        postgres.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        postgres_pool.putconn(postgres)


@masters.route("/post", methods=["POST"])
@authenticate_jwt_token
def create_master():
    if g.user["role"] != "admin":
        return jsonify({"error": "Admin only"}), 403

    data = request.get_json()

    postgres = postgres_pool.getconn()
    cursor = postgres.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM masters;")
        next_id = cursor.fetchone()['next_id']
        
        cursor.execute("""
            INSERT INTO masters
            (id, name, title_years, birth_year, death_year, nationality, favorite_piece)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *;
        """, (
            next_id,
            data.get("name"),
            data.get("title_years"),
            data.get("birth_year"),
            data.get("death_year"),
            data.get("nationality"),
            data.get("favorite_piece")
        ))

        postgres.commit()
        return jsonify(data=cursor.fetchone()), 201

    except Exception as e:
        postgres.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        postgres_pool.putconn(postgres)


@masters.route("/update/<int:id>", methods=["PATCH"])
@authenticate_jwt_token
def update_master(id):
    if g.user["role"] != "admin":
        return jsonify({"error": "Admin only"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    fields = []
    values = []

    for key in ["name", "title_years", "birth_year", "death_year", "nationality", "favorite_piece"]:
        if key in data:
            fields.append(f"{key}=%s")
            values.append(data[key])

    if not fields:
        return jsonify({"error": "No fields to update"}), 400

    values.append(id) 
    query = f"UPDATE masters SET {', '.join(fields)} WHERE id=%s RETURNING *;"

    postgres = postgres_pool.getconn()
    cursor = postgres.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(query, tuple(values))
        master = cursor.fetchone()
        if not master:
            return jsonify({"error": "Master not found"}), 404

        postgres.commit()
        return jsonify(data=master), 200

    except Exception as e:
        postgres.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        postgres_pool.putconn(postgres)

@masters.route("/delete/<int:id>", methods=["DELETE"])
@authenticate_jwt_token
def delete_master(id):
    if g.user["role"] != "admin":
        return jsonify({"error": "Admin only"}), 403

    postgres = postgres_pool.getconn()
    cursor = postgres.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            "DELETE FROM masters WHERE id=%s RETURNING *;",
            (id,)
        )
        master = cursor.fetchone()
        if not master:
            return jsonify({"error": "Not found"}), 404

        postgres.commit()
        return jsonify({"message": "Deleted", "data": master}), 200

    except Exception as e:
        postgres.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        postgres_pool.putconn(postgres)

@masters.route("/get-next-id", methods=["GET"])
@authenticate_jwt_token
def get_next_master_id():
    if g.user["role"] != "admin":
        return jsonify({"error": "Admin only"}), 403

    postgres = postgres_pool.getconn()
    cursor = postgres.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT id FROM masters ORDER BY id;")
        ids = [row['id'] for row in cursor.fetchall()]

        next_id = 1
        for i in ids:
            if i == next_id:
                next_id += 1
            else:
                break

        return jsonify({"next_id": next_id}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        postgres_pool.putconn(postgres)

@masters.route("/reset-sequence", methods=["POST"])
@authenticate_jwt_token
def reset_master_sequence():
    if g.user["role"] != "admin":
        return jsonify({"error": "Admin only"}), 403

    data = request.get_json()
    next_id = data.get("next_id")

    if not next_id or not isinstance(next_id, int):
        return jsonify({"error": "next_id required"}), 400

    postgres = postgres_pool.getconn()
    cursor = postgres.cursor()
    try:
        cursor.execute(f"ALTER SEQUENCE masters_id_seq RESTART WITH {next_id};")
        postgres.commit()
        return jsonify({"message": f"Sequence reset to {next_id}"}), 200

    except Exception as e:
        postgres.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        postgres_pool.putconn(postgres)