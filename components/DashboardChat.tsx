"use client";

import { useState, useEffect, useRef } from 'react';
import { Send, User, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface Message {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    content: string;
    created_at: string;
}

export default function DashboardChat({ dashboardId, currentUser }: { dashboardId: string, currentUser: any }) {
    const { showToast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Fetch & Polling
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [dashboardId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/dashboards/${dashboardId}/messages`);
            if (res.ok) {
                const data = await res.json();
                // Check if new messages to scroll? For now just set
                setMessages(data);
            }
        } catch (err) {
            console.error("Failed to load chat", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSending(true);
        // Optimistic update
        const tempId = Date.now().toString();
        const tempMsg: Message = {
            id: tempId,
            user_id: currentUser.id,
            user_name: currentUser.name,
            user_email: currentUser.email,
            content: newMessage,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, tempMsg]);
        setNewMessage("");

        try {
            const res = await fetch(`/api/dashboards/${dashboardId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: tempMsg.content })
            });

            if (res.ok) {
                const savedMsg = await res.json();
                // Replace temp with real
                setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m));
            } else {
                setMessages(prev => prev.filter(m => m.id !== tempId));
                showToast("Error al enviar mensaje", "error");
            }
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            showToast("Error de conexión", "error");
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', background: 'var(--bg-panel)', borderRadius: 16, border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: 16, borderBottom: '1px solid var(--border-dim)', background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 8, background: 'var(--primary-gradient)', borderRadius: '50%', color: 'white' }}>
                    <MessageCircle size={20} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Chat de Equipo</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Comunícate con todos los miembros de este tablero</p>
                </div>
            </div>

            {/* Messages List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {loading && <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 20 }}>Cargando mensajes...</div>}

                {!loading && messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40, background: 'var(--bg-card)', borderRadius: 12, border: '1px dashed var(--border-dim)' }}>
                        <MessageCircle size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                        <p>No hay mensajes aún.</p>
                        <p style={{ fontSize: 12 }}>¡Sé el primero en escribir algo!</p>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.user_id === currentUser.id;
                    const showHeader = index === 0 || messages[index - 1].user_id !== msg.user_id || (new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000);

                    return (
                        <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            {showHeader && (
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, marginLeft: isMe ? 0 : 44, marginRight: isMe ? 12 : 0 }}>
                                    {msg.user_name || msg.user_email?.split('@')[0]} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                {!isMe && (
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', flexShrink: 0 }}>
                                        <User size={16} />
                                    </div>
                                )}
                                <div style={{
                                    padding: '10px 16px',
                                    borderRadius: 16,
                                    borderTopRightRadius: isMe ? 4 : 16,
                                    borderTopLeftRadius: isMe ? 16 : 4,
                                    background: isMe ? 'var(--primary-gradient)' : 'var(--bg-card)',
                                    color: isMe ? 'white' : 'var(--text-main)',
                                    border: isMe ? 'none' : '1px solid var(--border-dim)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    fontSize: 14,
                                    lineHeight: 1.5,
                                    wordBreak: 'break-word'
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} style={{ padding: 16, background: 'var(--bg-card)', borderTop: '1px solid var(--border-dim)', display: 'flex', gap: 12 }}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 24,
                        border: '1px solid var(--border-dim)',
                        background: 'var(--bg-panel)',
                        color: 'var(--text-main)',
                        fontSize: 14,
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="shadow-glow hover-lift"
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'var(--primary-gradient)',
                        border: 'none',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        opacity: (!newMessage.trim() || sending) ? 0.5 : 1
                    }}
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}
