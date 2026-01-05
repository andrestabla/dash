const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting V7 Authorization Migration...');

        // 1. Create Users Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Users table created/verified.');

        // 2. Add Default Admin
        const email = 'proyectos@algoritmot.com';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if exists
        const check = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length === 0) {
            await client.query(`
            INSERT INTO users (email, password, role) 
            VALUES ($1, $2, 'admin')
        `, [email, hashedPassword]);
            console.log(`✅ Default Admin created: ${email}`);
        } else {
            console.log('ℹ️ Admin user already exists. Skipping creation.');
        }

        console.log('🎉 Migration V7 Complete!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
