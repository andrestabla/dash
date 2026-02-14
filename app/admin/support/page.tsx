"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { MessageCircle, CheckCircle, AlertCircle, Clock, Info, Reply, X, Send } from 'lucide-react';

export default function AdminSupportPage() {
    const { showToast } = useToast();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Reply Modal State
    const [replyingTicket, setReplyingTicket] = useState<any>(null);
    const [replyMessage, setReplyMessage] = useState("");
    const [sendingReply, setSendingReply] = useState(false);

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

    const openReplyModal = (ticket: any) => {
        setReplyingTicket(ticket);
        // Pre-fill? No, empty message.
        setReplyMessage(`Hola ${ticket.user_name || 'usuario'},\n\nRespecto a tu reporte: "${ticket.message.substring(0, 30)}..."\n\n`);
    };

    const sendReply = async () => {
        if (!replyMessage) return;
        setSendingReply(true);
        try {
            const res = await fetch('/api/support/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketId: replyingTicket.id,
                    to: replyingTicket.user_email,
                    subject: `Respuesta a su ticket de soporte (${replyingTicket.type})`,
                    message: replyMessage
                })
            });

            if (res.ok) {
                showToast("Respuesta enviada correctamente", "success");
                setReplyingTicket(null);
                setReplyMessage("");
            } else {
                showToast("Error al enviar respuesta", "error");
            }
        } catch {
            showToast("Error de conexión", "error");
        } finally {
            setSendingReply(false);
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
                            <th style={{ padding: 16, textAlign: 'left', fontSize: 13, color: 'var(--text-dim)' }}>ÚLTIMA ACTIVIDAD</th>
                            <th style={{ padding: 16, textAlign: 'right', fontSize: 13, color: 'var(--text-dim)' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
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
                                <td style={{ padding: 16, fontSize: 12, color: 'var(--text-dim)' }}>
                                    {t.updated_at ? new Date(t.updated_at).toLocaleString() : new Date(t.created_at).toLocaleString()}
                                </td>
                                <td style={{ padding: 16, textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                        <select
                                            className="input-glass"
                                            value={t.status}
                                            onChange={(e) => updateStatus(t.id, e.target.value)}
                                            style={{ fontSize: 13, padding: '4px 8px', width: 'auto' }}
                                        >
                                            <option value="open">Abierto</option>
                                            <option value="resolved">Resuelto</option>
                                            <option value="closed">Cerrado</option>
                                        </select>

                                        {t.user_email && (
                                            <button
                                                onClick={() => openReplyModal(t)}
                                                className="btn-ghost"
                                                title="Responder por correo"
                                                style={{ padding: 6, color: 'var(--primary)' }}
                                            >
                                                <Reply size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* REPLY MODAL */}
            {replyingTicket && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="glass-panel animate-slide-up" style={{ width: 600, maxWidth: '90vw', background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 24, padding: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h3 style={{ margin: 0, fontSize: 20 }}>Responder a {replyingTicket.user_name}</h3>
                            <button onClick={() => setReplyingTicket(null)} className="btn-ghost"><X size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gap: 16 }}>
                            <div>
                                <label className="form-label" style={{ fontSize: 12 }}>PARA</label>
                                <div className="input-glass" style={{ background: 'rgba(0,0,0,0.05)' }}>{replyingTicket.user_email}</div>
                            </div>

                            <div>
                                <label className="form-label" style={{ fontSize: 12 }}>ASUNTO</label>
                                <div className="input-glass" style={{ background: 'rgba(0,0,0,0.05)' }}>
                                    Respuesta a su ticket de soporte ({replyingTicket.type})
                                </div>
                            </div>

                            <div>
                                <label className="form-label">MENSAJE</label>
                                <textarea
                                    className="input-glass"
                                    rows={8}
                                    autoFocus
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Escribe tu respuesta aquí..."
                                    style={{ width: '100%', resize: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button onClick={() => setReplyingTicket(null)} className="btn-ghost" disabled={sendingReply}>Cancelar</button>
                            <button onClick={sendReply} className="btn-primary" disabled={sendingReply || !replyMessage}>
                                {sendingReply ? 'Enviando...' : (
                                    <>
                                        <Send size={16} style={{ marginRight: 8 }} /> Enviar Respuesta
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
