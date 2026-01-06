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
        console.log("🚀 Starting migration: Public Folders...");

        // 1. Add is_public column
        console.log("1. Adding 'is_public' column...");
        await client.query(`
            ALTER TABLE folders 
            ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
        `);

        // 2. Add public_token column
        console.log("2. Adding 'public_token' column...");
        await client.query(`
            ALTER TABLE folders 
            ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;
        `);

        console.log("✅ Migration complete!");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
