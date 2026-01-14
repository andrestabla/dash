"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, ChevronRight, AlertCircle, Lightbulb, Send } from "lucide-react";

export default function SupportWidget() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'menu' | 'form'>('menu');
    const [formType, setFormType] = useState<'issue' | 'idea'>('issue');
    const [message, setMessage] = useState("");

    // Hide on public pages
    const isPublic = [
        '/',
        '/login',
        '/register',
        '/donations',
        '/docs',
        '/help' // Maybe show on help too? No, help page is specialized.
    ].includes(pathname || '');

    // Also check if it starts with /landing or similar if existent
    // Simplistic check for now.
    if (isPublic) return null;

    const FAQS = [
        { q: "¿Cómo creo un nuevo proyecto?", a: "Ve al Workspace y haz clic en '+ Nuevo Proyecto'. Completa el asistente con nombre, fechas y equipo." },
        { q: "¿Cómo invito usuarios?", a: "En la configuración del tablero o carpeta, usa el botón 'Compartir' para agregar colaboradores por email." },
        { q: "¿Qué son los 'Gates'?", a: "Son los hitos de control (Gate A, B, C...) que definen el progreso de tu metodología de gobernanza." }
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here we would effectively send to API
        alert(`Gracias! Tu ${formType === 'issue' ? 'caso' : 'sugerencia'} ha sido enviada.`);
        setMessage("");
        setView('menu');
        setIsOpen(false);
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
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                                </div>
                            </>
                        ) : (
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
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
