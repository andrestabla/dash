import { NextResponse } from 'next/server';

export type ApiErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'CONFLICT'
    | 'RATE_LIMITED'
    | 'INTERNAL_ERROR';

// Standard API error response shape: { error, code }.
// `error` is a human-readable message; `code` is a stable machine-readable
// identifier so clients can branch on the failure type.
export function apiError(status: number, code: ApiErrorCode, message: string) {
    return NextResponse.json({ error: message, code }, { status });
}

export const unauthorized = (message = 'Unauthorized') =>
    apiError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'Forbidden') =>
    apiError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Not found') =>
    apiError(404, 'NOT_FOUND', message);

export const badRequest = (message: string) =>
    apiError(400, 'VALIDATION_ERROR', message);

export const conflict = (message: string) =>
    apiError(409, 'CONFLICT', message);

export const rateLimited = (message = 'Too many requests. Please try again later.') =>
    apiError(429, 'RATE_LIMITED', message);

// Always returns a generic message — never leak internal error details to the
// client. Log the underlying error server-side at the call site.
export const serverError = (message = 'Internal Server Error') =>
    apiError(500, 'INTERNAL_ERROR', message);
