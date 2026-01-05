import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    const client = await pool.connect();
    const diagnostics: any = {};

    try {
        // 1. Check Connection & List Tables
        const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        diagnostics.tables_before = tablesRes.rows.map(r => r.table_name);

        // 2. Create Users Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        diagnostics.table_creation = "Executed";

        // 3. Add Default Admin
        const email = 'proyectos@algoritmot.com';
        // Hash for 'admin123'
        const hashedPassword = '$2b$10$PzsiA/14UnT3yxavgKfIwOZm/pc4UJcaKRPLxjNBJk6cKlRBoy/AO';

        await client.query(`
        INSERT INTO users (email, password, role) 
        VALUES ($1, $2, 'admin')
        ON CONFLICT (email) DO NOTHING
    `, [email, hashedPassword]);
        diagnostics.admin_creation = "Executed";

        // 4. Verify Admin Exists
        const userRes = await client.query('SELECT id, email, role, created_at FROM users WHERE email = $1', [email]);
        diagnostics.admin_user_found = userRes.rows.length > 0 ? userRes.rows[0] : "NOT FOUND";

        // 5. List Tables Again
        const tablesResAfter = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
        diagnostics.tables_after = tablesResAfter.rows.map(r => r.table_name);

        return NextResponse.json({ success: true, diagnostics });

    } catch (error) {
        console.error(error);
        return NextResponse.json({
            success: false,
            error: String(error),
            stack: error instanceof Error ? error.stack : undefined,
            diagnostics
        }, { status: 500 });
    } finally {
        client.release();
    }
}
