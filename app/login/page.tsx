"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok) {
            router.push('/');
            router.refresh();
        } else {
            setError(data.error || 'Credenciales inválidas');
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: 'radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Abstract Background Shapes */}
            <div style={{ position: 'absolute', top: -100, right: -100, width: 600, height: 600, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
            <div style={{ position: 'absolute', bottom: -100, left: -100, width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />

            {/* Main Content */}
            <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>

                <div className="glass-panel animate-slide-up" style={{ width: 420, padding: 40, border: '1px solid rgba(255,255,255,0.08)' }}>

                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }} className="text-gradient">Bienvenido</h1>
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
                            <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 8, fontSize: 13, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                ⚠️ {error}
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

                    </form>

                    <div style={{ marginTop: 30, textAlign: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
                        Roadmap 4Shine &copy; 2026
                    </div>

                </div>

            </div>
        </div>
    );
}
