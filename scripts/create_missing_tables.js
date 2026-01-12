const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTables() {
    const client = await pool.connect();
    try {
        console.log('Creating folder_collaborators table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS folder_collaborators (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                folder_id VARCHAR(255) REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
                user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
                role VARCHAR(50) DEFAULT 'viewer',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(folder_id, user_id)
            )
        `);
        console.log('✅ table created.');
    } catch (e) {
        console.error('❌ Failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

createTables();
