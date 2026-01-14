import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { type, message } = await request.json();

        if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

        const client = await pool.connect();

        // Ensure table exists (Lazy Init)
        await client.query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                type VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        await client.query(
            "INSERT INTO support_tickets (user_id, type, message) VALUES ($1, $2, $3)",
            [session.id, type, message]
        );
        client.release();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Support ticket error", error);
        return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
    }
}
