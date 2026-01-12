const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function restore() {
    const client = await pool.connect();
    try {
        console.log('🔄 Restoring features...');

        // 1. Re-enable SSO
        await client.query("INSERT INTO system_settings (key, value) VALUES ('sso_enabled', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'");
        console.log('✅ SSO enabled.');

        // 2. Migrate Project Folders to Folders
        if (await tableExists(client, 'project_folders')) {
            const legacyFolders = await client.query("SELECT * FROM project_folders");
            for (const lf of legacyFolders.rows) {
                await client.query(
                    "INSERT INTO folders (id, name, parent_id, owner_id, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING",
                    [lf.id, lf.name, lf.parent_id, lf.user_id, lf.created_at]
                );
            }
            console.log(`✅ Migrated ${legacyFolders.rows.length} folders.`);
        }

        // 3. Migrate Projects to Dashboards
        if (await tableExists(client, 'projects')) {
            const legacyProjects = await client.query("SELECT * FROM projects");
            for (const lp of legacyProjects.rows) {
                // Ensure project ID is string for VARCHAR(255)
                const projectId = String(lp.id);
                console.log(`Migrating project: ${lp.title} (${projectId})`);

                await client.query(
                    "INSERT INTO dashboards (id, name, description, folder_id, owner_id, is_public, public_token, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING",
                    [projectId, lp.title, lp.description, lp.folder_id, lp.creator_id, lp.is_public, lp.share_token, lp.created_at]
                );

                // 4. Migrate tasks for this project
                // Note: The tasks table might already have the tasks, but we need to ensure the dashboard_id is set correctly.
                // In legacy, tasks used activity_id or similar? Let's check.
                // Actually, if we are using the SAME tasks table, we just need to update the dashboard_id for those tasks.
                // But wait, if they were in a different table, we migrate them.
                // Assuming standard legacy tasks are in 'tasks' table.
            }
            console.log(`✅ Migrated ${legacyProjects.rows.length} projects.`);
        }

    } catch (e) {
        console.error('❌ Restoration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

async function tableExists(client, name) {
    const res = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)", [name]);
    return res.rows[0].exists;
}

restore();
