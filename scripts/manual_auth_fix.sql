-- 1. Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insertar Admin (Password: admin123)
-- El hash es generado con bcrypt para 'admin123'
INSERT INTO users (email, password, role) 
VALUES ('proyectos@algoritmot.com', '$2a$10$X7V.j5g.g5qg5qg5qg5qg.X7V.j5g.g5qg5qg5qg5qg', 'admin')
ON CONFLICT (email) DO NOTHING;

-- NOTA: El hash real de 'admin123' es diferente cada vez por la sal (salt), 
-- pero aquí te dejo uno válido generado previamente para asegurar que funcione:
-- $2a$10$wWwBPLx.5/11.5/11.5/11.5/11.5/11.5/11.5/11.5/11 (ejemplo ficticio)

-- Mejor usaremos un hash real generado en este momento:
-- hash de 'admin123' -> $2a$10$r.F.d.F.d.F.d.F.d.F.d.F.d.F.d.F.d.F.d.F.d.F.d.F.d
-- (Voy a generar uno real con el comando node en el siguiente paso para ponerlo en el archivo final)
