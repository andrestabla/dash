"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Added
import { useTheme } from '@/components/ThemeProvider';
import { useToast } from '@/components/ToastProvider';
import { Shield } from 'lucide-react';
import PrivacyPolicyModal from '@/components/PrivacyPolicyModal';
import ConfirmModal from '@/components/ConfirmModal'; // Added

export default function ProfilePage() {
    const { theme, toggleTheme } = useTheme();
    const { showToast } = useToast();
    const router = useRouter(); // Added

    const [user, setUser] = useState({ name: '', email: '' });
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false); // Added

    const confirmDelete = () => setIsDeleteOpen(true);

    const handleDeleteAccount = async () => {
        try {
            const res = await fetch('/api/users/delete', { method: 'DELETE' });
            if (res.ok) {
                // Clear any local storage if needed?
                // Redirect to homepage or login
                showToast("Cuenta eliminada correctamente.", "success");
                router.push('/login');
                router.refresh(); // Ensure auth state clears
            } else {
                throw new Error("Deletion failed");
            }
        } catch {
            showToast("Error al eliminar la cuenta.", "error");
            setIsDeleteOpen(false);
        }
    };

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
    }, [showToast]);

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
        } catch {
            showToast('Error al actualizar el perfil', 'error');
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando perfil...</div>;

    return (
        <div className="profile-page" style={{ maxWidth: 600, margin: 'max(16px, var(--safe-top)) auto max(24px, var(--safe-bottom)) auto', padding: '0 max(12px, var(--safe-left)) 0 max(12px, var(--safe-right))' }}>
            <Link href="/workspace" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text-dim)', marginBottom: 20, fontWeight: 500 }}>
                <span>← Volver al Workspace</span>
            </Link>

            <div className="glass-panel animate-slide-up" style={{ padding: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Mi Perfil</h1>
                    <button onClick={toggleTheme} className="btn-ghost" style={{ fontSize: 20 }} title="Cambiar Tema">
                        {theme === 'dark' ? '🌙' : '☀️'}
                    </button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="form-group">
                        <label className="form-label">Email (No editable)</label>
                        <input className="input-glass" value={user.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nombre Completo</label>
                        <input className="input-glass" value={user.name || ''} onChange={e => setUser({ ...user, name: e.target.value })} placeholder="Tu nombre..." />
                    </div>

                    <div style={{ padding: 20, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 16, border: '1px solid rgba(59, 130, 246, 0.1)', marginBottom: 10 }}>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                            <label className="form-label" style={{ color: '#3b82f6' }}>Nueva Contraseña (Opcional)</label>
                            <input className="input-glass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Dejar en blanco para no cambiar" />
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>Mínimo 6 caracteres recomendado.</p>
                    </div>

                    <div className="profile-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255, 255, 255, 0.05)', gap: 12 }}>
                        <button
                            type="button"
                            onClick={() => setIsPolicyModalOpen(true)}
                            className="btn-ghost"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                color: 'var(--text-dim)',
                                padding: '8px 0'
                            }}
                        >
                            <Shield size={16} /> Consultar Política de Privacidad
                        </button>
                        <button type="submit" className="btn-primary profile-save-btn">Guardar Cambios</button>
                    </div>
                </form>

                {/* DANGER ZONE */}
                <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border-dim)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 16 }}>Zona de Peligro</h3>
                    <div className="danger-box" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 20, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>Eliminar Cuenta</h4>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>
                                Esta acción es irreversible. Se borrarán todos tus datos.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={confirmDelete}
                            className="btn-ghost danger-btn"
                            style={{ color: '#ef4444', borderColor: '#ef4444', border: '1px solid' }}
                        >
                            Eliminar Cuenta
                        </button>
                    </div>
                </div>
            </div>

            <PrivacyPolicyModal
                isOpen={isPolicyModalOpen}
                onClose={() => setIsPolicyModalOpen(false)}
            />

            <ConfirmModal
                isOpen={isDeleteOpen}
                title="¿Eliminar Cuenta permanentemente?"
                message="Esta acción no se puede deshacer. Todos tus proyectos, tableros y datos personales serán eliminados de nuestros servidores inmediatamente."
                confirmText="Sí, eliminar mi cuenta"
                onConfirm={handleDeleteAccount}
                onCancel={() => setIsDeleteOpen(false)}
                isDestructive={true}
            />

            <style jsx>{`
                @media (max-width: 768px) {
                    .profile-actions {
                        flex-direction: column;
                        align-items: stretch !important;
                    }
                    .profile-save-btn {
                        width: 100%;
                        justify-content: center;
                    }
                    .danger-btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    );
}
