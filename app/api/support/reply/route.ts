import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import pool from '@/lib/db';
import { unauthorized, badRequest, serverError } from '@/lib/api-error';

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session || session.role !== 'admin') {
        return unauthorized();
    }

    try {
        const { ticketId, to, subject, message } = await request.json();

        if (!to || !message) {
            return badRequest('Missing fields');
        }

        // Send Email
        const html = `
            <div style="font-family: sans-serif; color: #333;">
                <h3>Respuesta a su solicitud de soporte</h3>
                <p>${message.replace(/\n/g, '<br/>')}</p>
                <hr/>
                <p style="font-size: 12px; color: #666;">
                    Este es un mensaje automático del equipo de soporte. Por favor no responda directamente a este correo si es una dirección no-reply.
                </p>
            </div>
        `;

        const success = await sendEmail(to, subject, html);

        if (success) {
            // Auto-resolve ticket
            const client = await pool.connect();
            try {
                await client.query(
                    "UPDATE support_tickets SET status = 'resolved' WHERE id = $1",
                    [ticketId]
                );

                return NextResponse.json({ success: true });
            } finally {
                client.release();
            }
        } else {
            return serverError('Failed to send email');
        }

    } catch (error) {
        console.error("Reply error:", error);
        return serverError();
    }
}
