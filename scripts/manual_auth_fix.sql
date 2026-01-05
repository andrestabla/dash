-- 1. Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insertar Admin (Password: admin123)
-- Hash generado: $2b$10$PzsiA/14UnT3yxavgKfIwOZm/pc4UJcaKRPLxjNBJk6cKlRBoy/AO
INSERT INTO users (email, password, role) 
VALUES ('proyectos@algoritmot.com', '$2b$10$PzsiA/14UnT3yxavgKfIwOZm/pc4UJcaKRPLxjNBJk6cKlRBoy/AO', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Instrucciones:
-- 1. Copia todo este contenido.
-- 2. Ve a tu consola de Neon (SQL Editor).
-- 3. Pega y ejecuta (Run).
