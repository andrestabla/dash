const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function standardize() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    try {
        console.log('--- Phase 1: Schema Standardization ---');
        // Add updated_at to dashboards if missing
        await client.query('ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()');
        console.log('Added updated_at to dashboards');

        // Add updated_at to folders if missing
        await client.query('ALTER TABLE folders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()');
        console.log('Added updated_at to folders');

        // Add updated_at to tasks if missing
        await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()');
        console.log('Added updated_at to tasks');

        console.log('--- Phase 2: Data Repair ---');
        // Fix null owners
        const result = await client.query('UPDATE dashboards SET owner_id = (SELECT owner_id FROM folders WHERE folders.id = dashboards.folder_id) WHERE owner_id IS NULL AND folder_id IS NOT NULL');
        console.log(`Repaired ${result.rowCount} dashboard owners from folders`);

        // Migrate collaborators
        const mig = await client.query(`
            INSERT INTO dashboard_user_permissions (dashboard_id, user_id, role)
            SELECT dashboard_id, user_id, role FROM dashboard_collaborators
            ON CONFLICT (dashboard_id, user_id) DO UPDATE SET role = EXCLUDED.role
            RETURNING dashboard_id
        `);
        console.log(`Migrated ${mig.rowCount} collaborators`);

        console.log('--- Phase 3: Performance Optimization ---');
        // Add missing indexes
        await client.query('CREATE INDEX IF NOT EXISTS idx_dashboards_owner_id ON dashboards(owner_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_dashboards_folder_id ON dashboards(folder_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_dashboard_id_status ON tasks(dashboard_id, status)');
        console.log('Added optimization indexes');

        console.log('--- ✅ Standardization Completed ---');

    } catch (e) {
        console.error('Error during standardization:', e);
    } finally {
        await client.end();
    }
}

standardize();
