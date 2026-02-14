const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function debugChat() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        const client = await pool.connect();
        console.log("Connected to DB");

        // 1. Check Table Schema
        const schemaRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'dashboard_messages'
        `);
        console.log("Schema:", schemaRes.rows);

        // 2. Get a valid dashboard and user
        const dashRes = await client.query('SELECT id FROM dashboards LIMIT 1');
        const userRes = await client.query('SELECT id FROM users LIMIT 1');

        if (dashRes.rows.length === 0 || userRes.rows.length === 0) {
            console.log("No dashboard or user found to test with.");
            return;
        }

        const dashId = dashRes.rows[0].id;
        const userId = userRes.rows[0].id;

        console.log(`Testing insert for DashID: ${dashId} (Type: ${typeof dashId}) and UserID: ${userId} (Type: ${typeof userId})`);

        // 3. Try Insert
        try {
            const insertRes = await client.query(`
                INSERT INTO dashboard_messages (dashboard_id, user_id, content)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [dashId, userId, "Test message from debug script"]);
            console.log("Insert Success:", insertRes.rows[0]);
        } catch (insertErr) {
            console.error("Insert Failed:", insertErr.message);
        }

        client.release();
    } catch (err) {
        console.error("General Error:", err.message);
    } finally {
        await pool.end();
    }
}

debugChat();
