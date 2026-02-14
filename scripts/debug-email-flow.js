const { Pool } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function debugEmailFlow() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();

    try {
        console.log("1. Fetching SMTP Settings...");
        const res = await client.query("SELECT key, value FROM system_settings WHERE key LIKE 'smtp_%'");
        const config = {};
        res.rows.forEach(r => config[r.key] = r.value);

        console.log("SMTP Config Found:", {
            host: config.smtp_host,
            port: config.smtp_port,
            user: config.smtp_user,
            pass: config.smtp_pass ? '******' : 'MISSING',
            from: config.smtp_from
        });

        if (!config.smtp_host || !config.smtp_user) {
            console.error("❌ SMTP Settings missing in DB!");
            return;
        }

        console.log("2. Creating Transporter...");
        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: parseInt(config.smtp_port) || 587,
            secure: config.smtp_port === '465',
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass,
            },
        });

        console.log("3. Verifying Connection...");
        await transporter.verify();
        console.log("✅ SMTP Connection Verified!");

        // Test sending to a user (simulate mention)
        const targetEmail = 'andrestabla@algoritmot.com'; // User's email from context
        console.log(`4. Attempting to send test email to ${targetEmail}...`);

        let fromAddress = config.smtp_user;
        if (config.smtp_from) {
            // Simple logic from lib/email.ts for testing
            if (config.smtp_from.includes('<')) {
                fromAddress = `"${config.smtp_from.split('<')[0].trim().replace(/"/g, '')}" <${config.smtp_user}>`;
            } else {
                fromAddress = `"${config.smtp_from}" <${config.smtp_user}>`;
            }
        }

        const info = await transporter.sendMail({
            from: fromAddress,
            to: targetEmail,
            subject: 'Test Notification Debug',
            html: '<p>This is a test email to verify the notification system.</p>',
        });

        console.log("✅ Email Sent!", info.messageId);

    } catch (err) {
        console.error("❌ ERROR:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

debugEmailFlow();
