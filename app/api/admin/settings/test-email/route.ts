import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getSession } from '@/lib/auth';

const verifyAdmin = async () => {
    const session = await getSession();
    return session?.role === 'admin';
};

export async function POST(request: Request) {
    if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const body = await request.json();
        const { host, port, user, pass, secure, to, from } = body;

        if (!host || !port || !user || !pass || !to) {
            return NextResponse.json({ error: 'Missing configuration fields' }, { status: 400 });
        }

        // SMART CONFIG: If port is 587, it is consistently STARTTLS (secure: false).
        // If port is 465, it is SSL (secure: true).
        // Using "secure: true" on port 587 usually fails immediately.
        const portNum = parseInt(port);
        const isSecure = (portNum === 465) || (String(secure) === 'true' && portNum !== 587);

        const transporter = nodemailer.createTransport({
            host,
            port: portNum,
            secure: isSecure,
            auth: { user, pass },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify connection configuration
        await transporter.verify();

        // SAFE SENDER LOGIC (Replicated from lib/email.ts)
        let fromAddress = user;

        if (from) {
            let fromName = from;
            if (fromName.includes('<')) {
                fromName = fromName.split('<')[0].trim();
                fromName = fromName.replace(/^"|"$/g, '');
            } else if (fromName.includes('@')) {
                if (fromName === user) {
                    fromName = '';
                }
            }

            if (fromName) {
                fromAddress = `"${fromName}" <${user}>`;
            }
        }

        await transporter.sendMail({
            from: fromAddress,
            to: user, // Send to self for testing
            subject: 'Test de Configuración SMTP',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">¡Configuración Exitosa!</h2>
                    <p>Este es un correo de prueba enviado desde tu plataforma.</p>
                    <p><strong>Configuración utilizada:</strong></p>
                    <ul>
                        <li>Host: ${host}</li>
                        <li>Port: ${port}</li>
                        <li>User: ${user}</li>
                        <li>From (Configurado): ${from || '(Igual al usuario)'}</li>
                        <li>From (Real): ${fromAddress.replace('<', '&lt;').replace('>', '&gt;')}</li>
                    </ul>
                </div>
            `,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SMTP Test Error:", error);
        return NextResponse.json({ error: error.message || 'Failed to send test email' }, { status: 500 });
    }
}
