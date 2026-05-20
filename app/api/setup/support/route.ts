import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { forbidden, notFound, serverError } from '@/lib/api-error';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return notFound();
    }

    const session = await getSession() as any;
    if (!session || session.role !== 'admin') {
        return forbidden('Unauthorized');
    }

    try {
        const client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                type VARCHAR(50) NOT NULL, -- 'issue' | 'idea'
                message TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'open', -- 'open', 'resolved', 'closed'
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        client.release();
        return NextResponse.json({ success: true, message: "Table created" });
    } catch (e: any) {
        console.error("Setup support table error:", e);
        return serverError();
    }
}
