import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getSession() as any;
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

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
    diagnostics.table_creation_users = "Executed";

    // V8: Create System Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    diagnostics.table_creation_settings = "Executed";

    // V8: Default Settings
    await client.query(`
        INSERT INTO system_settings (key, value, description)
        VALUES 
            ('app_name', 'Roadmap 4Shine', 'Bannner Title'),
            ('logo_url', 'https://www.algoritmot.com/wp-content/uploads/2022/08/Recurso-8-1536x245.png', 'App Logo'),
            ('smtp_host', '', 'Email Server'),
            ('smtp_port', '587', 'Email Port'),
            ('smtp_user', '', 'Email User'),
            ('smtp_pass', '', 'Email Password'),
            ('smtp_from', 'no-reply@roadmap.com', 'Sender Email')
        ON CONFLICT (key) DO NOTHING;
    `);

    // V8: Create Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    diagnostics.table_creation_notifications = "Executed";


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
