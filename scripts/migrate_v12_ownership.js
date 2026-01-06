const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("🚀 Starting ownership migration (V12)...");

        // 1. Add owner_id to folders
        console.log("Adding owner_id to folders...");
        await client.query(`
            ALTER TABLE folders 
            ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
        `);

        // 2. Add owner_id to dashboards
        console.log("Adding owner_id to dashboards...");
        await client.query(`
            ALTER TABLE dashboards 
            ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
        `);

        // 3. Set existing records to be owned by the first admin found
        const adminRes = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (adminRes.rows.length > 0) {
            const adminId = adminRes.rows[0].id;
            console.log(`Setting existing records' owner_id to admin: ${adminId}`);

            await client.query("UPDATE folders SET owner_id = $1 WHERE owner_id IS NULL", [adminId]);
            await client.query("UPDATE dashboards SET owner_id = $1 WHERE owner_id IS NULL", [adminId]);
        } else {
            console.warn("⚠️ No admin user found. Existing records will have NULL owner_id (visible to all/admins only).");
        }

        console.log("✅ Ownership migration completed successfully!");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
