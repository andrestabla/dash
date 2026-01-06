const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting migration V9: Folders...');

        // 1. Create Folders Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Created "folders" table.');

        // 2. Add folder_id to Dashboards
        // Check if column exists first to avoid error on rerun
        const checkCol = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='dashboards' AND column_name='folder_id'
    `);

        if (checkCol.rows.length === 0) {
            await client.query(`
            ALTER TABLE dashboards 
            ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
        `);
            console.log('✅ Added "folder_id" to "dashboards" table.');
        } else {
            console.log('ℹ️ "folder_id" column already exists.');
        }

        console.log('🎉 Migration V9 complete!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
