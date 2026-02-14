"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, AlertCircle, Lightbulb, Send, List } from "lucide-react";

export default function SupportWidget() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'menu' | 'form' | 'tickets'>('menu');
    const [formType, setFormType] = useState<'issue' | 'idea'>('issue');
    const [message, setMessage] = useState("");
    const [tickets, setTickets] = useState<any[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    // Hide on public pages
    const isPublic = [
        '/',
        '/login',
        '/register',
        '/donations',
        '/docs',
        '/help'
    ].includes(pathname || '');

    if (isPublic) return null;

    const FAQS = [
        { q: "¿Cómo creo un nuevo proyecto?", a: "Ve al Workspace y haz clic en '+ Nuevo Proyecto'. Completa el asistente con nombre, fechas y equipo." },
        { q: "¿Cómo invito usuarios?", a: "En la configuración del tablero o carpeta, usa el botón 'Compartir' para agregar colaboradores por email." },
        { q: "¿Qué son los 'Gates'?", a: "Son los hitos de control (Gate A, B, C...) que definen el progreso de tu metodología de gobernanza." },
        { q: "¿Cómo elimino mi cuenta?", a: "Ve a 'Mi Perfil' (clic en tu avatar/icono usuario) y baja hasta la 'Zona de Peligro' para encontrar la opción de eliminación." },
        { q: "¿Aceptan otros medios de pago?", a: "Actualmente procesamos donaciones vía PayPal, que acepta saldo y tarjetas de crédito/débito internacionales." }
    ];

    const loadTickets = async () => {
        setLoadingTickets(true);
        try {
            const res = await fetch('/api/support/my-tickets');
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch {
            console.error("Failed to load tickets");
        } finally {
            setLoadingTickets(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: formType, message })
            });
            if (res.ok) {
                alert(`Gracias! Tu ${formType === 'issue' ? 'caso' : 'sugerencia'} ha sido enviada. Nuestro equipo administrativo la revisará.`);
                setMessage("");
                loadTickets(); // Refresh list
                setView('menu');
                setIsOpen(false);
            } else {
                alert("Error al enviar. Intenta nuevamente.");
            }
        } catch {
            alert("Error de conexión al enviar.");
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-outfit">
            {/* Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="shadow-glow hover-lift"
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'var(--primary-gradient)',
                        border: 'none',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)'
                    }}
                >
                    <MessageCircle size={28} />
                </button>
            )}

            {/* Panel */}
            {isOpen && (
                <div
                    className="glass-panel animate-slide-up"
                    style={{
                        width: 350,
                        maxHeight: 600,
                        borderRadius: 16,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-dim)'
                    }}
                >
                    {/* Header */}
                    <div style={{ padding: 16, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Ayuda y Soporte</h3>
                        <button onClick={() => setIsOpen(false)} className="btn-ghost" style={{ padding: 4 }}><X size={18} /></button>
                    </div>

                    <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
                        {view === 'menu' ? (
                            <>
                                {/* FAQs */}
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 12 }}>Preguntas Frecuentes</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {FAQS.map((faq, i) => (
                                            <details key={i} style={{ background: 'var(--bg-card)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
                                                <summary style={{ padding: 12, cursor: 'pointer', fontSize: 13, fontWeight: 500, listStyle: 'none' }}>{faq.q}</summary>
                                                <div style={{ padding: '0 12px 12px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                                                    {faq.a}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div>
                                    <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 12 }}>¿Necesitas más ayuda?</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                        <button
                                            onClick={() => { setFormType('issue'); setView('form'); }}
                                            className="btn-ghost"
                                            style={{ flexDirection: 'column', gap: 8, padding: 16, height: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}
                                        >
                                            <div style={{ color: '#ef4444' }}><AlertCircle size={24} /></div>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>Reportar Fallo</span>
                                        </button>
                                        <button
                                            onClick={() => { setFormType('idea'); setView('form'); }}
                                            className="btn-ghost"
                                            style={{ flexDirection: 'column', gap: 8, padding: 16, height: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}
                                        >
                                            <div style={{ color: '#f59e0b' }}><Lightbulb size={24} /></div>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>Sugerir Mejora</span>
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                        <a
                                            href="/tutorials"
                                            className="btn-ghost"
                                            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 12, border: '1px solid var(--border-dim)', background: 'var(--bg-card)', textDecoration: 'none', padding: 12 }}
                                        >
                                            <span style={{ fontSize: 16 }}>📚</span> <span style={{ fontSize: 13, fontWeight: 600 }}>Tutoriales y Guías</span>
                                        </a>
                                        <button
                                            onClick={() => { setView('tickets'); loadTickets(); }}
                                            className="btn-ghost"
                                            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 12, border: '1px solid var(--border-dim)', background: 'var(--bg-card)', padding: 12 }}
                                        >
                                            <List size={18} style={{ color: 'var(--primary)' }} /> <span style={{ fontSize: 13, fontWeight: 600 }}>Mis Solicitudes</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : view === 'form' ? (
                            <form onSubmit={handleSubmit} className="animate-fade-in">
                                <button
                                    type="button"
                                    onClick={() => setView('menu')}
                                    className="btn-ghost"
                                    style={{ marginBottom: 16, padding: '0', fontSize: 13, color: 'var(--text-dim)' }}
                                >
                                    ← Volver
                                </button>

                                <h4 style={{ margin: '0 0 16px', fontSize: 16 }}>
                                    {formType === 'issue' ? 'Reportar un Problema' : 'Sugerir una Mejora'}
                                </h4>

                                <div className="form-group">
                                    <label className="form-label">
                                        {formType === 'issue' ? 'Describe el error' : 'Describe tu idea'}
                                    </label>
                                    <textarea
                                        className="input-glass"
                                        rows={5}
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        placeholder={formType === 'issue' ? "Ej: No puedo guardar el tablero..." : "Ej: Sería genial tener modo oscuro..."}
                                        required
                                        style={{ width: '100%', resize: 'none' }}
                                    />
                                </div>

                                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 8 }}>
                                    <Send size={16} style={{ marginRight: 8 }} /> Enviar
                                </button>
                            </form>
                        ) : (
                            <div className="animate-fade-in">
                                <button
                                    type="button"
                                    onClick={() => setView('menu')}
                                    className="btn-ghost"
                                    style={{ marginBottom: 16, padding: '0', fontSize: 13, color: 'var(--text-dim)' }}
                                >
                                    ← Volver
                                </button>

                                <h4 style={{ margin: '0 0 16px', fontSize: 16 }}>Mis Solicitudes</h4>

                                {loadingTickets ? (
                                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)' }}>Cargando...</div>
                                ) : tickets.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)', fontSize: 13 }}>
                                        No tienes solicitudes creadas todavía.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {tickets.map(t => (
                                            <div key={t.id} style={{ padding: 12, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-dim)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: t.type === 'issue' ? '#ef4444' : '#f59e0b' }}>
                                                        {t.type === 'issue' ? 'Fallo' : 'Mejora'}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        color: t.status === 'resolved' ? '#10b981' : (t.status === 'open' ? '#3b82f6' : 'var(--text-dim)')
                                                    }}>
                                                        {t.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {t.message}
                                                </p>
                                                <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 8 }}>
                                                    {new Date(t.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
