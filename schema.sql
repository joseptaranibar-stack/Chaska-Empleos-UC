-- Esquema PostgreSQL para Chaska Empleo UC
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    age INT,
    phone VARCHAR(20),
    cycle VARCHAR(20),
    career VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(100),
    plan VARCHAR(30) DEFAULT 'Gratuito',
    ai_tokens_used INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    job_id VARCHAR(50) NOT NULL,
    business_name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    schedule VARCHAR(100) NOT NULL,
    pay VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    job_title VARCHAR(100) NOT NULL,
    shift_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Confirmado',
    can_swap BOOLEAN DEFAULT FALSE
);
