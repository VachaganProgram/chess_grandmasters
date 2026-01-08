import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv
import os

load_dotenv()

postgres_pool = psycopg2.pool.ThreadedConnectionPool(
    1, 20, 
    os.getenv("DATABASE_URL")
)