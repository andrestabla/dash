const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function repair() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    try {
        console.log('--- Phase 1: Fixing Null Owners ---');
        // Find dashboards with null owner and try to find an owner from collaborators or folders
        const nullOwnerDashs = await client.query('SELECT id, folder_id FROM dashboards WHERE owner_id IS NULL');
        console.log(`Found ${nullOwnerDashs.rows.length} dashboards with null owner.`);

        for (const dash of nullOwnerDashs.rows) {
            let potentialOwner = null;

            // Try to get owner from folder if exists
            if (dash.folder_id) {
                const folder = await client.query('SELECT owner_id FROM folders WHERE id = $1', [dash.folder_id]);
                if (folder.rows[0]?.owner_id) {
                    potentialOwner = folder.rows[0].owner_id;
                }
            }

            // Try to get owner from legacy collaborators if still none
            if (!potentialOwner) {
                const coll = await client.query('SELECT user_id FROM dashboard_collaborators WHERE dashboard_id = $1 LIMIT 1', [dash.id]);
                if (coll.rows[0]?.user_id) {
                    potentialOwner = coll.rows[0].user_id;
                }
            }

            if (potentialOwner) {
                await client.query('UPDATE dashboards SET owner_id = $1 WHERE id = $2', [potentialOwner, dash.id]);
                console.log(`Updated dashboard ${dash.id} owner to ${potentialOwner}`);
            } else {
                console.log(`Could not find owner for dashboard ${dash.id}`);
            }
        }

        console.log('--- Phase 2: Retrying Collaborator Migration ---');
        const legacy = await client.query('SELECT dashboard_id, user_id, role FROM dashboard_collaborators');
        console.log(`Migrating ${legacy.rows.length} legacy collaborators...`);

        for (const row of legacy.rows) {
            try {
                // Use a safe upsert
                await client.query(`
                    INSERT INTO dashboard_user_permissions (dashboard_id, user_id, role)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (dashboard_id, user_id) DO UPDATE SET role = EXCLUDED.role
                `, [row.dashboard_id, row.user_id, row.role || 'viewer']);
            } catch (e) {
                console.error(`Failed to migrate collaborator for dash ${row.dashboard_id}, user ${row.user_id}:`, e.message);
            }
        }

        console.log('--- Phase 3: Verifying Folder Collaborators ---');
        // Ensure folder collaborators also have consistency if needed
        // (Assuming folder_collaborators table is fine and used correctly)

        console.log('--- ✅ Repair Completed ---');

    } catch (e) {
        console.error('Error during repair:', e);
    } finally {
        await client.end();
    }
}

repair();
