import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { verifyToken } from './lib/auth';

export async function proxy(request: NextRequest) {
    // Basic CSRF protection for state-changing requests.
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const origin = request.headers.get('origin');
        const host = request.headers.get('host');

        if (origin) {
            const originHost = new URL(origin).host;
            if (originHost !== host) {
                return new NextResponse('Forbidden: Cross-site request blocked', { status: 403 });
            }
        }
    }

    const path = request.nextUrl.pathname;
    const isApiRoute = path.startsWith('/api/');

    const isProtected = path.startsWith('/board') ||
        path.startsWith('/workspace') ||
        path.startsWith('/admin') ||
        path.startsWith('/api/dashboards') ||
        path.startsWith('/api/tasks');

    const token = request.cookies.get('session')?.value;
    const verified = token ? await verifyToken(token) : null;

    if (path === '/') {
        if (verified) {
            return NextResponse.redirect(new URL('/workspace', request.url));
        }
        return NextResponse.next();
    }

    if (path === '/login' && verified) {
        return NextResponse.redirect(new URL('/workspace', request.url));
    }

    if (!verified && isProtected) {
        if (isApiRoute) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (path.startsWith('/admin') && verified?.role !== 'admin') {
        return NextResponse.redirect(new URL('/workspace', request.url));
    }

    const isExemptFromPolicy = path.startsWith('/onboarding/privacy-policy') ||
        path === '/api/auth/accept-policy' ||
        path === '/api/auth/logout';

    if (verified && !verified.accepted_privacy_policy && !isExemptFromPolicy && isProtected) {
        if (isApiRoute) {
            return NextResponse.json({ error: 'Privacy policy not accepted' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/onboarding/privacy-policy', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
