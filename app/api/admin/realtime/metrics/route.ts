import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getRealtimeMetrics } from '@/lib/realtime';

export async function GET() {
    const session = await getSession() as any;
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
        status: 'ok',
        realtime: getRealtimeMetrics(),
        ts: new Date().toISOString()
    });
}
