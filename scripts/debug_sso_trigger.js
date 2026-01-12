const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function debugTrigger() {
    const client = await pool.connect();
    try {
        const settingsRes = await client.query(
            "SELECT key, value FROM system_settings WHERE key IN ('sso_enabled', 'sso_platform', 'sso_client_id', 'sso_authority')"
        );

        const settings = {};
        settingsRes.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        console.log('Backend Settings Object:', JSON.stringify(settings, null, 2));

        if (settings['sso_enabled'] !== 'true') {
            console.log('Result: REDIRECT TO LOGIN (SSO_DISABLED)');
        } else {
            console.log('Result: PROCEED TO IDENTITY PROVIDER');
            console.log('Platform:', settings['sso_platform']);
        }

    } catch (error) {
        console.error('Failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

debugTrigger();
