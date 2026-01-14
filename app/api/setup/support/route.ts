import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
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
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
