import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendEmail } from '@/lib/email';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { badRequest, rateLimited, serverError } from '@/lib/api-error';

function escapeHtml(str: string): string {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

export async function POST(request: Request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    try {
        const body = await request.json();
        const { email, password, name } = body;

        if (!email || !password || !name) {
            return badRequest('Todos los campos son obligatorios');
        }

        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (!normalizedEmail) {
            return badRequest('Email inválido');
        }

        const client = await pool.connect();

        try {
            // Rate limiting: max 3 attempts per hour per IP
            const rateLimitCheck = await client.query(
                `SELECT COUNT(*) FROM login_attempts
                 WHERE ip_address = $1
                 AND email LIKE 'REG:%'
                 AND attempted_at > NOW() - INTERVAL '1 hour'`,
                [ip]
            );

            if (parseInt(rateLimitCheck.rows[0].count) >= 3) {
                return rateLimited('Demasiadas solicitudes');
            }

            // Record attempt
            await client.query(
                'INSERT INTO login_attempts (ip_address, email, success) VALUES ($1, $2, FALSE)',
                [ip, `REG:${normalizedEmail}`]
            );

            // 1. Check if user already exists
            const check = await client.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
            if (check.rows.length > 0) {
                return badRequest('El correo electrónico ya está registrado');
            }

            // 2. Hash password and insert user as 'pending'
            const hashed = await bcrypt.hash(password, 10);
            const result = await client.query(
                'INSERT INTO users (email, password, name, status, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name',
                [normalizedEmail, hashed, name, 'pending', 'user']
            );

            const newUser = result.rows[0];

            // 3. Log the registration request
            await logAction(newUser.id, 'USER_REGISTERED', 'Usuario se registró vía formulario público', newUser.id, client);

            // Mark as success in attempts
            await client.query(
                'UPDATE login_attempts SET success = TRUE WHERE ip_address = $1 AND email = $2',
                [ip, `REG:${normalizedEmail}`]
            );

            // 4. Fetch admin emails for notification
            const admins = await client.query("SELECT email FROM users WHERE role = 'admin'");

            // 5. Send Notification Emails
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://misproyectos.com.co';

            // To User
            const userHtml = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                    <div style="background: #3b82f6; padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">¡Registro Recibido! 🚀</h1>
                    </div>
                    <div style="padding: 30px; line-height: 1.6;">
                        <p>Hola <b>${escapeHtml(name)}</b>,</p>
                        <p>Gracias por registrarte en <b>Project Control</b>. Tu solicitud ha sido recibida correctamente.</p>
                        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; font-weight: 600;">Estado de la cuenta: <span style="color: #f59e0b;">Pendiente de aprobación</span></p>
                        </div>
                        <p>Un administrador revisará tu solicitud en breve. Recibirás un correo electrónico una vez que tu cuenta haya sido activada.</p>
                    </div>
                </div>
            `;
            await sendEmail(normalizedEmail, "Registro Recibido - Project Control", userHtml);

            // To Admins
            const adminHtml = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                    <div style="background: #1e293b; padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Nueva Solicitud de Registro 👤</h1>
                    </div>
                    <div style="padding: 30px; line-height: 1.6;">
                        <p>Se ha recibido una nueva solicitud de cuenta en la plataforma:</p>
                        <ul style="background: #f8fafc; padding: 20px; border-radius: 8px; list-style: none;">
                            <li><b>Nombre:</b> ${escapeHtml(name)}</li>
                            <li><b>Email:</b> ${escapeHtml(normalizedEmail)}</li>
                            <li><b>Fecha:</b> ${new Date().toLocaleString()}</li>
                        </ul>
                        <p>Puedes revisar y aprobar esta solicitud desde el panel de administración.</p>
                        <br />
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
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Registration error:', error);
        return serverError('Error al procesar el registro');
    }
}
