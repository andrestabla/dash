const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testVisibility() {
    const client = await pool.connect();
    try {
        // Test for a common user
        const userIdRes = await client.query("SELECT id, email FROM users WHERE role != 'admin' LIMIT 1");
        if (userIdRes.rows.length === 0) {
            console.log("No non-admin users found.");
            return;
        }
        const user = userIdRes.rows[0];
        console.log(`Testing visibility for user: ${user.email} (${user.id})`);

        const query = `
            SELECT d.id, d.name, d.is_demo FROM dashboards d
            LEFT JOIN dashboard_user_permissions dc ON d.id = dc.dashboard_id
            WHERE d.owner_id = $1 
            OR dc.user_id = $1
            OR d.folder_id IN (SELECT folder_id FROM folder_collaborators WHERE user_id = $1)
            OR d.is_demo = TRUE
            GROUP BY d.id
            ORDER BY d.created_at DESC
        `;
        const res = await client.query(query, [user.id]);
        console.table(res.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

testVisibility();
