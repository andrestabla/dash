const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function debugApi() {
    const client = await pool.connect();
    try {
        const settingsRes = await client.query(
            "SELECT key, value FROM system_settings WHERE key IN ('sso_enabled', 'sso_platform')"
        );

        console.log('DB Rows:', JSON.stringify(settingsRes.rows, null, 2));

        const settings = {};
        settingsRes.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        const response = {
            enabled: settings['sso_enabled'] === 'true',
            platform: settings['sso_platform'] || null
        };

        console.log('API Response:', JSON.stringify(response, null, 2));

    } catch (error) {
        console.error('Failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

debugApi();
