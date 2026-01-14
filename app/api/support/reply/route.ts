import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import pool from '@/lib/db';

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { ticketId, to, subject, message } = await request.json();

        if (!to || !message) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
            // Update ticket status to resolved automatically? Optional.
            // Let's just update the updated_at or log it. 
            // For now, simple success is enough. 
            // Maybe we mark it as 'resolved' if the admin wants, but let's leave that manual for now 
            // or we could auto-resolve. Let's stick to just sending.

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
        }

    } catch (error) {
        console.error("Reply error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
