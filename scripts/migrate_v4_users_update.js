const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not set.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("Starting V4 User Management Migration...");

        // 1. Add name column to users
        console.log("Adding 'name' column to users table...");
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS name TEXT;
        `);
        console.log("'name' column added (or already exists).");

        // 2. Create Audit Logs table
        console.log("Creating 'audit_logs' table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                action TEXT NOT NULL,
                details TEXT,  -- Using TEXT to store JSON string or simple description
                performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Add index for faster lookups by user
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);`);

        console.log("'audit_logs' table created.");

        console.log("✅ V4 User Management Migration Complete!");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
