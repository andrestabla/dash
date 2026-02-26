const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('🚀 Safe UUID migration for tasks.id...');
        await client.query('BEGIN');

        // 1. Add a temp UUID column to tasks
        await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS new_uuid UUID DEFAULT gen_random_uuid()`);

        // 2. Drop FKs from child tables
        await client.query('ALTER TABLE task_assignees DROP CONSTRAINT IF EXISTS task_assignees_task_id_fkey');
        await client.query('ALTER TABLE task_assignees DROP CONSTRAINT IF EXISTS fk_task_assignees_task');
        await client.query('ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_task_id_fkey');
        await client.query('ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS fk_task_comments_task');

        // 3. Add temp UUID columns to child tables
        await client.query(`ALTER TABLE task_assignees ADD COLUMN IF NOT EXISTS new_task_uuid UUID`);

        const commentsExists = await client.query(`
            SELECT 1 FROM information_schema.tables WHERE table_name = 'task_comments'
        `);
        if (commentsExists.rows.length > 0) {
            await client.query(`ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS new_task_uuid UUID`);
        }

        // 4. Populate temp UUID in child tables based on old string matching
        await client.query(`
            UPDATE task_assignees ta
            SET new_task_uuid = t.new_uuid
            FROM tasks t
            WHERE ta.task_id::text = t.id::text
        `);

        if (commentsExists.rows.length > 0) {
            await client.query(`
                UPDATE task_comments tc
                SET new_task_uuid = t.new_uuid
                FROM tasks t
                WHERE tc.task_id::text = t.id::text
            `);
        }

        // 5. Drop old PK and set new_uuid as PK
        await client.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_pkey`);
        await client.query(`ALTER TABLE tasks DROP COLUMN id`);
        await client.query(`ALTER TABLE tasks RENAME COLUMN new_uuid TO id`);
        await client.query(`ALTER TABLE tasks ADD PRIMARY KEY (id)`);

        // 6. Update child tables
        await client.query(`ALTER TABLE task_assignees DROP COLUMN task_id`);
        await client.query(`ALTER TABLE task_assignees RENAME COLUMN new_task_uuid TO task_id`);

        if (commentsExists.rows.length > 0) {
            await client.query(`ALTER TABLE task_comments DROP COLUMN task_id`);
            await client.query(`ALTER TABLE task_comments RENAME COLUMN new_task_uuid TO task_id`);
            await client.query(`ALTER TABLE task_comments ADD CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`);
        }

        // 7. Re-add FK on task_assignees
        await client.query(`ALTER TABLE task_assignees ADD CONSTRAINT fk_task_assignees_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`);

        await client.query('COMMIT');
        console.log('✅ tasks.id successfully migrated to UUID!');

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
