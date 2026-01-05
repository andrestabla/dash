import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const client = await pool.connect();

        // 1. Create Users Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 2. Add Default Admin
        const email = 'proyectos@algoritmot.com';
        // Hash for 'admin123'
        const hashedPassword = '$2b$10$PzsiA/14UnT3yxavgKfIwOZm/pc4UJcaKRPLxjNBJk6cKlRBoy/AO';

        await client.query(`
        INSERT INTO users (email, password, role) 
        VALUES ($1, $2, 'admin')
        ON CONFLICT (email) DO NOTHING
    `, [email, hashedPassword]);

        client.release();
        return NextResponse.json({ success: true, message: "Database Initialized & Admin Created Successfully" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
