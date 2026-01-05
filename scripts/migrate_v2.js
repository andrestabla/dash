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
        console.log("Starting v2 migration...");

        // 1. Create Dashboard Table
        console.log("Creating 'dashboards' table...");
        await client.query(`
      CREATE TABLE IF NOT EXISTS dashboards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // 2. Check if default dashboard exists, if not create it
        console.log("Ensuring default dashboard...");
        let defaultDashId;
        const dashRes = await client.query("SELECT id FROM dashboards WHERE name = 'Roadmap 4Shine' LIMIT 1");

        if (dashRes.rows.length > 0) {
            defaultDashId = dashRes.rows[0].id;
            console.log("Default dashboard found:", defaultDashId);
        } else {
            const newDash = await client.query(`
            INSERT INTO dashboards (name, description) 
            VALUES ('Roadmap 4Shine', 'Roadmap original migrado') 
            RETURNING id
        `);
            defaultDashId = newDash.rows[0].id;
            console.log("Created default dashboard:", defaultDashId);
        }

        // 3. Alter Tasks Table
        console.log("Altering 'tasks' table...");

        // Check if column exists
        const checkCol = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='tasks' AND column_name='dashboard_id';
    `);

        if (checkCol.rows.length === 0) {
            // Add column
            await client.query(`ALTER TABLE tasks ADD COLUMN dashboard_id UUID;`);
            console.log("Added 'dashboard_id' column.");

            // Link existing tasks to default dashboard
            await client.query(`UPDATE tasks SET dashboard_id = $1 WHERE dashboard_id IS NULL`, [defaultDashId]);
            console.log("Linked existing tasks to default dashboard.");

            // Add FK constraint
            await client.query(`
            ALTER TABLE tasks 
            ADD CONSTRAINT fk_dashboard 
            FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) 
            ON DELETE CASCADE;
        `);
            console.log("Added Foreign Key constraint.");
        } else {
            console.log("'dashboard_id' column already exists. Skipping alter.");
        }

        console.log("✅ Migration v2 complete!");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
