import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, name } = body;

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
        }

        const client = await pool.connect();

        // 1. Check if user already exists
        const check = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            client.release();
            return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 400 });
        }

        // 2. Hash password and insert user as 'pending'
        const hashed = await bcrypt.hash(password, 10);
        const result = await client.query(
            'INSERT INTO users (email, password, name, status, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name',
            [email, hashed, name, 'pending', 'user']
        );

        const newUser = result.rows[0];

        // 3. Log the registration request
        await client.query(
            'INSERT INTO audit_logs (user_id, action, details, performed_by) VALUES ($1, $2, $3, $4)',
            [newUser.id, 'SELF_REGISTER', 'User registered via public form, pending approval', newUser.id]
        );

        // 4. Fetch admin emails for notification
        const admins = await client.query("SELECT email FROM users WHERE role = 'admin'");

        client.release();

        // 5. Send Notification Emails
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://misproyectos.com.co';

        // To User
        const userHtml = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                <div style="background: #3b82f6; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">¡Registro Recibido! 🚀</h1>
                </div>
                <div style="padding: 30px; line-height: 1.6;">
                    <p>Hola <b>${name}</b>,</p>
                    <p>Gracias por registrarte en <b>Project Control</b>. Tu solicitud ha sido recibida correctamente.</p>
                    <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; font-weight: 600;">Estado de la cuenta: <span style="color: #f59e0b;">Pendiente de aprobación</span></p>
                    </div>
                    <p>Un administrador revisará tu solicitud en breve. Recibirás un correo electrónico una vez que tu cuenta haya sido activada.</p>
                </div>
            </div>
        `;
        await sendEmail(email, "Registro Recibido - Project Control", userHtml);

        // To Admins
        const adminHtml = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                <div style="background: #1e293b; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Nueva Solicitud de Registro 👤</h1>
                </div>
                <div style="padding: 30px; line-height: 1.6;">
                    <p>Se ha recibido una nueva solicitud de cuenta en la plataforma:</p>
                    <ul style="background: #f8fafc; padding: 20px; border-radius: 8px; list-style: none;">
                        <li><b>Nombre:</b> ${name}</li>
                        <li><b>Email:</b> ${email}</li>
                        <li><b>Fecha:</b> ${new Date().toLocaleString()}</li>
                    </ul>
                    <p>Puedes revisar y aprobar esta solicitud desde el panel de administración.</p>
                    <br/>
                    <a href="${appUrl}/admin/users" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                        Ir a Gestión de Usuarios
                    </a>
                </div>
            </div>
        `;

        for (const admin of admins.rows) {
            await sendEmail(admin.email, `Solicitud de Registro: ${name}`, adminHtml);
        }

        return NextResponse.json({ success: true, message: 'Registro exitoso, pendiente de aprobación' }, { status: 201 });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Error al procesar el registro' }, { status: 500 });
    }
}
