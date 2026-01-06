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
        // SAFE SENDER LOGIC:
        // Office 365 and others reject emails where 'from' != 'auth.user'.
        // We allow the user to set a custom "From Name", but we MUST use the auth email.

        let fromAddress = config.smtp_user; // Default

        if (config.smtp_from) {
            // Check if user entered "Name <email>" or just "Email" or just "Name"
            // We only care about the NAME part. The email MUST be config.smtp_user.

            let fromName = config.smtp_from;

            // Simple check: if it looks like an email "foo@bar.com", we assume they wanted that name? 
            // Or if they typed "My App <foo@bar.com>", we extract "My App".

            if (fromName.includes('<')) {
                // Extract name from "Name <email>"
                fromName = fromName.split('<')[0].trim();
                // Remove quotes if present
                fromName = fromName.replace(/^"|"$/g, '');
            } else if (fromName.includes('@')) {
                // If they just put "foo@bar.com", we might want to use that as the name, 
                // OR ideally, we only want a friendly name. 
                // Let's assume whatever they put is the "Name" they want shown, 
                // unless it is literally the auth user email to avoid redundancy.
                if (fromName === config.smtp_user) {
                    fromName = ''; // Use default
                }
            }

            if (fromName) {
                fromAddress = `"${fromName}" <${config.smtp_user}>`;
            }
        }

        await transporter.sendMail({
            from: fromAddress,
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
