import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
    const publicRoutes = ['/login', '/_next', '/api/auth', '/api/setup', '/favicon.ico', '/api/auth/login', '/api/auth/me'];
    const path = request.nextUrl.pathname;

    // Explicitly check for protected paths
    const isProtected = path.startsWith('/board') ||
        path.startsWith('/workspace') ||
        path.startsWith('/admin') ||
        path.startsWith('/api/dashboards') ||
        path.startsWith('/api/tasks');

    const token = request.cookies.get('session')?.value;
    const verified = token ? await verifyToken(token) : null;

    // Handle Landing Page vs Workspace
    if (path === '/') {
        if (verified) {
            return NextResponse.redirect(new URL('/workspace', request.url));
        }
        return NextResponse.next(); // Show Landing Page
    }

    // Redirect authenticated users from login to workspace
    if (path === '/login' && verified) {
        return NextResponse.redirect(new URL('/workspace', request.url));
    }

    // Redirect to login if not authenticated for protected routes
    if (!verified && isProtected) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role Based Access Control
    if (path.startsWith('/admin') && verified?.role !== 'admin') {
        return NextResponse.redirect(new URL('/workspace', request.url));
    }

    // Privacy Policy Enforcement
    // If authenticated but hasn't accepted policy, redirect to onboarding
    // Exempt: /onboarding/privacy-policy, /api/auth/accept-policy, /api/auth/logout
    const isExemptFromPolicy = path.startsWith('/onboarding/privacy-policy') ||
        path === '/api/auth/accept-policy' ||
        path === '/api/auth/logout';

    if (verified && !verified.accepted_privacy_policy && !isExemptFromPolicy && isProtected) {
        return NextResponse.redirect(new URL('/onboarding/privacy-policy', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
