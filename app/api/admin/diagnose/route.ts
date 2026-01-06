import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    // Allow admin access for diagnostics
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const client = await pool.connect();

        // Check for 'name' column in users
        const nameColumnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'name'
        `);

        // Check for 'audit_logs' table
        const auditLogsCheck = await client.query(`
            SELECT to_regclass('audit_logs') as exists
        `);

        // Check for 'created_at' in users (just to be sure)
        const usersTableCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);

        client.release();

        return NextResponse.json({
            users_table_columns: usersTableCheck.rows.map(r => r.column_name),
            has_name_column: nameColumnCheck.rows.length > 0,
            has_audit_logs_table: !!auditLogsCheck.rows[0].exists,
            database_connected: true
        });
    } catch (error: any) {
        return NextResponse.json({
            error: 'Database check failed',
            details: error.message,
            database_connected: false
        }, { status: 500 });
    }
}
