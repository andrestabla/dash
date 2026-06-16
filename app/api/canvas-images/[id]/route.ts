import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { badRequest, notFound, serverError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

// Serves a single canvas comment image by ID. Anyone with the URL can fetch
// it: image IDs are unguessable UUIDs, and public board viewers must also
// resolve them — adding a session check would break the read-only public
// share. The URL only appears in canvas documents the user already opened,
// so this is effectively a capability token.
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) return badRequest('Invalid image id');

    const client = await pool.connect();
    try {
        const res = await client.query(
            'SELECT data, mime FROM canvas_images WHERE id = $1',
            [id]
        );
        if (res.rows.length === 0) return notFound('Image not found');
        const row = res.rows[0];
        const buffer: Buffer = row.data;
        const mime: string = row.mime || 'application/octet-stream';
        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': mime,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Content-Length': String(buffer.length)
            }
        });
    } catch (error) {
        console.error('Canvas image read error:', error);
        return serverError('Failed to load canvas image');
    } finally {
        client.release();
    }
}
