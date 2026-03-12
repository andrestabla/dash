const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const sql = `
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_value INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_unit VARCHAR(10);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tasks_notifications ON tasks(notification_enabled, notification_sent) WHERE notification_enabled = TRUE AND notification_sent = FALSE;
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
