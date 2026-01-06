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

async function checkComments() {
    const client = await pool.connect();
    try {
        console.log("Fetching last 5 comments...");
        const res = await client.query(`
            SELECT id, task_id, user_email, user_name, content, created_at 
            FROM task_comments 
            ORDER BY created_at DESC 
            LIMIT 5;
        `);
        console.table(res.rows);
    } catch (err) {
        console.error("Query failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkComments();
