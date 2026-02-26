const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('🚀 Migrating tasks.id to UUID...');
        await client.query('BEGIN');

        // 1. Drop FK from task_assignees referencing tasks.id
        await client.query('ALTER TABLE task_assignees DROP CONSTRAINT IF EXISTS task_assignees_task_id_fkey');
        await client.query('ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_task_id_fkey');
        await client.query('ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS fk_task_comments_task');

        // 2. Convert task_assignees and task_comments to have UUID task_id
        // First convert tasks.id to UUID
        await client.query(`ALTER TABLE tasks ALTER COLUMN id TYPE UUID USING id::UUID`);

        // 3. Convert child table task_id columns
        await client.query(`ALTER TABLE task_assignees ALTER COLUMN task_id TYPE UUID USING task_id::UUID`);

        const commentsExists = await client.query(`
            SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_name = 'task_comments' AND column_name = 'task_id'
        `);
        if (commentsExists.rows.length > 0) {
            await client.query(`ALTER TABLE task_comments ALTER COLUMN task_id TYPE UUID USING task_id::UUID`);
            await client.query(`ALTER TABLE task_comments ADD CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`);
        }

        await client.query(`ALTER TABLE task_assignees ADD CONSTRAINT fk_task_assignees_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`);

        await client.query('COMMIT');
        console.log('✅ tasks.id successfully migrated to UUID');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ MIGRATION FAILED:', e.message);
        if (e.detail) console.error('Detail:', e.detail);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
