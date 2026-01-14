"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { MessageCircle, CheckCircle, AlertCircle, Clock, Info } from 'lucide-react';

export default function AdminSupportPage() {
    const { showToast } = useToast();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        try {
            const res = await fetch('/api/support/tickets');
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (e) {
            showToast("Error al cargar tickets", "error");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch('/api/support/tickets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            });
            if (res.ok) {
                showToast("Estado actualizado", "success");
                loadTickets();
            }
        } catch {
            showToast("Error al actualizar", "error");
        }
    };

    if (loading) return <div style={{ padding: 40 }}>Cargando soporte...</div>;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ background: 'var(--primary-gradient)', padding: 10, borderRadius: 12, color: 'white' }}>
                    <MessageCircle size={24} />
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Centro de Soporte</h1>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-dim)', background: 'rgba(0,0,0,0.02)' }}>
                            <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: 'var(--text-dim)' }}>USUARIO</th>
                            <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: 'var(--text-dim)' }}>TIPO</th>
                            <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: 'var(--text-dim)' }}>MENSAJE</th>
                            <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: 'var(--text-dim)' }}>ESTADO</th>
                            <th style={{ padding: 16, textAlign: 'right', fontSize: 13, color: 'var(--text-dim)' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
                                    No hay tickets pendientes.
                                </td>
                            </tr>
                        )}
                        {tickets.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                <td style={{ padding: 16 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.user_name || 'Usuario desconocido'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t.user_email}</div>
                                </td>
                                <td style={{ padding: 16 }}>
                                    {t.type === 'issue' ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '4px 8px', borderRadius: 20, fontSize: 11 }}>
                                            <AlertCircle size={12} /> FALLO
                                        </span>
                                    ) : (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '4px 8px', borderRadius: 20, fontSize: 11 }}>
                                            <Info size={12} /> MEJORA
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: 16, maxWidth: 400 }}>
                                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                                        {t.message}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                                        {new Date(t.created_at).toLocaleString()}
                                    </div>
                                </td>
                                <td style={{ padding: 16 }}>
                                    {t.status === 'open' && <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: 13 }}>Abierto</span>}
                                    {t.status === 'resolved' && <span style={{ color: '#10b981', fontWeight: 600, fontSize: 13 }}>Resuelto</span>}
                                    {t.status === 'closed' && <span style={{ color: 'var(--text-dim)', fontWeight: 600, fontSize: 13 }}>Cerrado</span>}
                                </td>
                                <td style={{ padding: 16, textAlign: 'right' }}>
                                    <select
                                        className="input-glass"
                                        value={t.status}
                                        onChange={(e) => updateStatus(t.id, e.target.value)}
                                        style={{ fontSize: 13, padding: '4px 8px' }}
                                    >
                                        <option value="open">Abierto</option>
                                        <option value="resolved">Resuelto</option>
                                        <option value="closed">Cerrado</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
