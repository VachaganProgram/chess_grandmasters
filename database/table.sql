CREATE TABLE users(
    ID SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'guest' CHECK (role in ('admin','guest'))
);
CREATE TABLE masters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    title_years VARCHAR(50),
    birth_year INTEGER,
    death_year INTEGER,
    nationality VARCHAR(50),
    favorite_piece TEXT
);
