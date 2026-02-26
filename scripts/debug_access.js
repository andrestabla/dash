const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function debug() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    try {
        const dashId = '1e3b652e-f9bc-4e9c-bf3c-c10fa8f44a0b';
        console.log('--- Dashboard Check ---');
        const dashRes = await client.query('SELECT * FROM dashboards WHERE id = $1', [dashId]);
        if (dashRes.rows.length === 0) {
            console.log('Dashboard not found!');
        } else {
            const dash = dashRes.rows[0];
            console.log(`Name: ${dash.name}`);
            console.log(`Owner ID: ${dash.owner_id}`);
            console.log(`Folder ID: ${dash.folder_id}`);

            console.log('--- Owner Details ---');
            const ownerRes = await client.query('SELECT id, name, email FROM users WHERE id = $1', [dash.owner_id]);
            console.log(ownerRes.rows[0]);

            console.log('--- Direct Permissions ---');
            const permRes = await client.query('SELECT * FROM dashboard_user_permissions WHERE dashboard_id = $1', [dashId]);
            console.log(permRes.rows);

            console.log('--- Folder Permissions ---');
            if (dash.folder_id) {
                const folderRes = await client.query('SELECT * FROM folder_collaborators WHERE folder_id = $1', [dash.folder_id]);
                console.log(folderRes.rows);
            }

            console.log('--- Task Check ---');
            const taskCount = await client.query('SELECT COUNT(*) FROM tasks WHERE dashboard_id = $1', [dashId]);
            console.log(`Task Count: ${taskCount.rows[0].count}`);

            const sampleTasks = await client.query('SELECT id, name, status FROM tasks WHERE dashboard_id = $1 LIMIT 5', [dashId]);
            console.log('Sample Tasks:', sampleTasks.rows);
        }

        console.log('--- Performance Test: Workspace Query ---');
        const userId = dashRes.rows[0]?.owner_id;
        if (userId) {
            const start = Date.now();
            const wsRes = await client.query(`
                SELECT d.id FROM dashboards d
                LEFT JOIN dashboard_user_permissions dc ON d.id = dc.dashboard_id
                WHERE d.owner_id = $1 
                OR dc.user_id = $1
                OR d.folder_id IN (SELECT folder_id FROM folder_collaborators WHERE user_id = $1)
                GROUP BY d.id
            `, [userId]);
            const end = Date.now();
            console.log(`Workspace query took ${end - start}ms and returned ${wsRes.rows.length} rows`);
        }

    } catch (e) {
        console.error('Error during debug:', e);
    } finally {
        await client.end();
    }
}

debug();
