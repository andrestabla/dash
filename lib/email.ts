import nodemailer from 'nodemailer';
import pool from '@/lib/db';

async function getSmtpConfig() {
    const client = await pool.connect();
    const res = await client.query("SELECT key, value FROM system_settings WHERE key LIKE 'smtp_%'");
    client.release();

    const config: any = {};
    res.rows.forEach(r => config[r.key] = r.value);
    return config;
}

export async function sendEmail(to: string, subject: string, html: string) {
    const config = await getSmtpConfig();

    if (!config.smtp_host || !config.smtp_user) {
        console.warn("⚠️ SMTP not configured. Email skipped:", subject);
        return false;
    }

    const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: parseInt(config.smtp_port) || 587,
        secure: config.smtp_port === '465',
        auth: {
            user: config.smtp_user,
            pass: config.smtp_pass,
        },
    });

    try {
        await transporter.sendMail({
            from: config.smtp_from || config.smtp_user,
            to,
            subject,
            html,
        });
        return true;
    } catch (error) {
        console.error("❌ Email failed:", error);
        return false;
    }
}
