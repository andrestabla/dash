import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

let warnedInsecureDevSecret = false;

function getJwtSecret() {
    const envSecret = process.env.JWT_SECRET?.trim();

    if (envSecret) {
        return envSecret;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET is required in production');
    }

    if (!warnedInsecureDevSecret) {
        warnedInsecureDevSecret = true;
        console.warn('[AUTH] Using insecure development fallback JWT secret. Set JWT_SECRET to test auth safely.');
    }

    return 'dev-insecure-jwt-secret';
}

function getJwtKey() {
    return new TextEncoder().encode(getJwtSecret());
}

export async function signToken(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(getJwtKey());
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, getJwtKey());
        return payload;
    } catch (error) {
        return null;
    }


}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) {
        return null;
    }
    return await verifyToken(token);
}



export async function login(payload: any) {
    const token = await signToken(payload);
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
    });
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.set('session', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
    });
}
