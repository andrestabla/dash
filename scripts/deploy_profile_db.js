const { Pool } = require('pg');

// Credentials provided by user
const connectionString = 'postgres://neondb_owner:npg_7qvpgUrD6Qfc@ep-red-rice-a4po8o6h-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔌 Conectado a Neon DB...');

        // 1. Add 'name' column to users
        console.log('🛠️ Verifying users table schema...');

        // Check if column exists
        const checkRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='name'
    `);

        if (checkRes.rows.length === 0) {
            console.log('⚠️ Columna "name" no encontrada. Agregando...');
            await client.query('ALTER TABLE users ADD COLUMN name TEXT');
            console.log('✅ Columna "name" agregada exitosamente.');
        } else {
            console.log('✅ La columna "name" ya existe.');
        }

        // 2. Ensure system_settings exists (just in case)
        console.log('🛠️ Verifying system_settings table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
        console.log('✅ Tabla system_settings verificada.');

    } catch (err) {
        console.error('❌ Error durante la migración:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
