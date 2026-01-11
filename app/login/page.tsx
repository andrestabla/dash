"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [detail, setDetail] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [ssoConfig, setSsoConfig] = useState<{ enabled: boolean, platform: string | null }>({ enabled: false, platform: null });
    const router = useRouter();
    const searchParams = useSearchParams();
    const { branding } = useTheme();

    useEffect(() => {
        // Use direct window search for more reliability during hydration
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const urlError = params.get('error');
        const urlDetails = params.get('details');

        if (urlError) {
            console.log('Error parameter detected:', urlError, urlDetails);
            if (urlError === 'SSO_SYNC_FAILED') {
                setError('Error de sincronización SSO');
            } else if (urlError === 'SSO_DISABLED') {
                setError('El acceso SSO no está habilitado');
            } else {
                setError(urlError);
            }

            if (urlDetails) setDetail(urlDetails);
        }
    }, []);

    useEffect(() => {
        const checkSso = async () => {
            try {
                const res = await fetch('/api/auth/sso-status');
                if (res.ok) {
                    const data = await res.json();
                    setSsoConfig(data);
                }
            } catch (err) {
                console.error('Error checking SSO status:', err);
            }
        };
        checkSso();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {

        e.preventDefault();
        setLoading(true);
        setError('');
        setDetail('');
        setStatus('Enviando solicitud...');
        console.log('Login attempt started...');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            console.log('Fetching /api/auth/login...');
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                signal: controller.signal
            });

            setStatus('Recibiendo respuesta...');
            console.log('Response status:', res.status);
            clearTimeout(timeoutId);

            const contentType = res.headers.get('content-type');
            const data = (contentType && contentType.includes('application/json'))
                ? await res.json()
                : { error: 'Error del servidor (no JSON)' };

            if (res.ok) {
                setStatus('¡Éxito! Redirigiendo (Force)...');
                console.log('Login success, forcing window.location.href...');
                // Force full reload to /workspace
                window.location.href = '/workspace';
            } else {
                setError(data.error || 'Credenciales inválidas');
                if (data.detail) setDetail(data.detail);
                setLoading(false);
                setStatus('');
                console.log('Login failed:', data.error);
            }
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.name === 'AbortError' ? 'El servidor tardó demasiado (15s)' : 'Error de conexión');
            setDetail(err.message);
            setLoading(false);
            setStatus('');
        }
    };

    // Determine Background Style
    const bgStyle = branding.brand_login_bg?.startsWith('http')
        ? { backgroundImage: `url(${branding.brand_login_bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: branding.brand_login_bg || 'radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 100%)' };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            ...bgStyle,
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Overlay if image */}
            {branding.brand_login_bg?.startsWith('http') && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
            )}

            {/* Abstract Background Shapes (Only if gradient/default) */}
            {!branding.brand_login_bg?.startsWith('http') && (
                <>
                    <div style={{ position: 'absolute', top: -100, right: -100, width: 600, height: 600, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
                    <div style={{ position: 'absolute', bottom: -100, left: -100, width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
                </>
            )}

            {/* Main Content */}

            <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>

                <div className="glass-panel animate-slide-up" style={{ width: 420, padding: 40, border: '1px solid rgba(255,255,255,0.08)' }}>

                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                            {branding.brand_logo_url ? (
                                <img src={branding.brand_logo_url} alt="Logo" style={{ height: 60, marginBottom: 16, objectFit: 'contain', cursor: 'pointer' }} />
                            ) : (
                                <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }} className="text-gradient">Bienvenido</h1>
                            )}
                        </Link>
                        <p style={{ color: 'var(--text-dim)' }}>Inicia sesión para continuar</p>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                            <input
                                type="email"
                                required
                                className="input-glass"
                                placeholder="nombre@empresa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contraseña</label>
                            <input
                                type="password"
                                required
                                className="input-glass"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="animate-fade-in" style={{
                                padding: 16,
                                background: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: 12,
                                fontSize: 13
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontWeight: 700 }}>
                                    <span style={{ fontSize: 18 }}>⚠️</span>
                                    <span>{error}</span>
                                </div>

                                {detail && (
                                    <div style={{ marginTop: 12 }}>
                                        <div style={{
                                            fontSize: 10,
                                            fontWeight: 800,
                                            color: '#f87171',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            marginBottom: 6,
                                            opacity: 0.8
                                        }}>
                                            Diagnóstico Técnico
                                        </div>
                                        <div style={{
                                            padding: 10,
                                            background: 'rgba(0,0,0,0.3)',
                                            borderRadius: 8,
                                            fontFamily: 'monospace',
                                            fontSize: 11,
                                            color: 'var(--text-dim)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            wordBreak: 'break-all'
                                        }}>
                                            {detail}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.4 }}>
                                            <strong>Sugerencias:</strong><br />
                                            - Si ves "Unauthorized", revisa que el <i>Client Secret</i> sea correcto.<br />
                                            - Si ves "redirect_uri_mismatch", asegúrate de añadir tanto la versión con <strong>www</strong> como la versión <strong>sin www</strong> en Google Console.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ justifyContent: 'center', marginTop: 10, height: 48, fontSize: 15 }}
                        >
                            {loading ? 'Entrando...' : 'Ingresar al Portal'}
                        </button>

                        {status && (
                            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginTop: 8, animation: 'pulse 2s infinite' }}>
                                {status}
                            </div>
                        )}

                        {ssoConfig.enabled && (
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>O continuar con</span>
                                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => window.location.href = '/api/auth/sso'}
                                    className="btn-ghost"
                                    style={{
                                        height: 48,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 12
                                    }}
                                >
                                    {ssoConfig.platform === 'google' ? (
                                        <img src="https://www.vectorlogo.zone/logos/google/google-icon.svg" alt="Google" style={{ width: 18 }} />
                                    ) : ssoConfig.platform === 'microsoft' ? (
                                        <img src="https://www.vectorlogo.zone/logos/microsoft/microsoft-icon.svg" alt="Microsoft" style={{ width: 18 }} />
                                    ) : (
                                        <div style={{ width: 20, height: 20, background: 'var(--primary-gradient)', borderRadius: '50%' }} />
                                    )}
                                    {ssoConfig.platform === 'google' ? 'Acceso con Google' :
                                        ssoConfig.platform === 'microsoft' ? 'Acceso con Microsoft' :
                                            'Acceso con tu cuenta empresarial'}
                                </button>
                            </div>
                        )}

                    </form>

                    <div style={{ marginTop: 24, textAlign: 'center', paddingTop: 24, borderTop: '1px solid var(--border-dim)' }}>
                        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                            ¿No tienes cuenta? <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Regístrate aquí</Link>
                        </p>
                    </div>

                    <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', opacity: 0.6 }}>
                        Project control &copy; 2026 by Algoritmo T
                    </div>

                </div>

            </div>
        </div>
    );
}
