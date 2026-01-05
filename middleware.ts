import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
    const publicRoutes = ['/login', '/_next', '/api/auth', '/api/setup', '/favicon.ico'];
    const path = request.nextUrl.pathname;

    // Skip public assets/routes
    if (publicRoutes.some(p => path.startsWith(p))) {
        return NextResponse.next();
    }

    // Explicitly check for protected paths standard
    const isProtected = path.startsWith('/board') || path === '/' || path.startsWith('/admin') || path.startsWith('/api/dashboards') || path.startsWith('/api/tasks');
    // If not in protected paths (e.g. landing page if we had one separate), we might skip, but Root is protected.

    if (!isProtected) {
        // Maybe allow unchecked access to other things? For now, let's just protect core.
        // Actually, let's protect everything except login if it's not a public asset.
    }

    const token = request.cookies.get('session')?.value;
    const verified = token ? await verifyToken(token) : null;

    // Redirect to login if not authenticated for protected routes
    if (!verified && isProtected) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role Based Access Control (Optional Step)
    if (path.startsWith('/admin') && verified?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url)); // Redirect to workspace if not admin
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
