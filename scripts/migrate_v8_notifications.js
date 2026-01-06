const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.argv[2];

if (!connectionString) {
    console.error("Please provide DATABASE_URL as env var or argument");
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("Checking/Creating notifications table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Notifications table matched/created.");

        // Check columns to be sure
        const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='notifications'`);
        console.log("Columns:", res.rows.map(r => r.column_name));

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
