"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import { useToast } from '@/components/ToastProvider';

export default function ProfilePage() {
    const { theme, toggleTheme } = useTheme();
    const { showToast } = useToast();

    const [user, setUser] = useState({ name: '', email: '' });
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/users/profile')
            .then(res => {
                if (!res.ok) throw new Error("Failed to load");
                return res.json();
            })
            .then(data => {
                setUser(data);
                setLoading(false);
            })
            .catch(() => {
                showToast("Error al cargar perfil", "error");
                setLoading(false);
            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: user.name, password })
            });

            if (res.ok) {
                showToast('¡Perfil actualizado correctamente!', 'success');
                setPassword('');
            } else {
                throw new Error("Update failed");
            }
        } catch (error) {
            showToast('Error al actualizar el perfil', 'error');
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando perfil...</div>;

    return (
        <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text-dim)', marginBottom: 20, fontWeight: 500 }}>
                <span>← Volver al Workspace</span>
            </Link>

            <div className="glass-panel animate-slide-up" style={{ padding: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Mi Perfil</h1>
                    <button onClick={toggleTheme} className="btn-ghost" style={{ fontSize: 20 }} title="Cambiar Tema">
                        {theme === 'dark' ? '🌙' : '☀️'}
                    </button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase' }}>Email (No editable)</label>
                        <input className="input-glass" value={user.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed', padding: '10px 12px' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase' }}>Nombre Completo</label>
                        <input className="input-glass" value={user.name || ''} onChange={e => setUser({ ...user, name: e.target.value })} placeholder="Tu nombre..." style={{ padding: '10px 12px' }} />
                    </div>

                    <div style={{ padding: 20, background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border-dim)' }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase' }}>Nueva Contraseña (Opcional)</label>
                        <input className="input-glass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Dejar en blanco para no cambiar" style={{ padding: '10px 12px' }} />
                        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '8px 0 0 0' }}>Mínimo 6 caracteres recomendado.</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <button type="submit" className="btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
