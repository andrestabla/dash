const { Pool } = require('pg');

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
        console.log("Starting V3 Optimization Migration...");

        // 1. Indexes for Performance
        console.log("Creating Indexes...");
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_dashboard_id ON tasks(dashboard_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_week ON tasks(week);`);
        console.log("Indexes created.");

        // 2. Enforce Constrains (Integrity)
        console.log("Enforcing Constraints...");
        // Ensure no nulls exist before adding constraint (should have been fixed in v2 but safe check)
        // We won't block migration if there are issues, but we'll try to enforce.
        try {
            await client.query(`ALTER TABLE tasks ALTER COLUMN dashboard_id SET NOT NULL;`);
            console.log("Constraint 'dashboard_id NOT NULL' applied.");
        } catch (e) {
            console.warn("Could not enforce NOT NULL on dashboard_id (tasks might exist without dashboard linkage):", e.message);
        }

        // 3. Audit Columns
        console.log("Adding Audit Columns...");
        await client.query(`
        ALTER TABLE tasks 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

        // 4. Update Trigger
        console.log("Setting up Triggers...");

        // Create function if not exists
        await client.query(`
        CREATE OR REPLACE FUNCTION update_modified_column() 
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW; 
        END;
        $$ language 'plpgsql';
    `);

        // Create trigger
        // Drop first to allow re-running script idempotently
        await client.query(`DROP TRIGGER IF EXISTS update_tasks_modtime ON tasks;`);
        await client.query(`
        CREATE TRIGGER update_tasks_modtime 
        BEFORE UPDATE ON tasks 
        FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
    `);

        console.log("✅ V3 Optimization Complete!");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
