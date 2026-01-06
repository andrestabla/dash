const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("Starting Sharing Migration...");

        // 1. Add columns to dashboards table
        console.log("Adding columns to dashboards...");
        await client.query(`
            ALTER TABLE dashboards 
            ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS public_token UUID UNIQUE;
        `);

        // 2. Create dashboard_collaborators table
        console.log("Creating dashboard_collaborators table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS dashboard_collaborators (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role TEXT DEFAULT 'viewer',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(dashboard_id, user_id)
            );
        `);

        console.log("✅ Sharing migration completed successfully!");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
