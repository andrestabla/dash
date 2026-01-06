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

        // Send test email
        await transporter.sendMail({
            from: from || `"Test System" <${user}>`,
            to: to,
            subject: "Prueba de conexión SMTP - Roadmap 4Shine",
            text: "Si estás leyendo esto, la configuración SMTP funciona correctamente.",
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #3b82f6;">¡Conexión Exitosa! 🚀</h2>
                    <p>Este es un correo de prueba enviado desde tu aplicación <strong>Roadmap 4Shine</strong>.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #666;">
                        <strong>Configuración probada:</strong><br/>
                        Host: ${host}:${port}<br/>
                        Usuario: ${user}
                    </p>
                </div>
            `
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("SMTP Test Error:", error);
        return NextResponse.json({ error: error.message || 'Failed to send test email' }, { status: 500 });
    }
}
