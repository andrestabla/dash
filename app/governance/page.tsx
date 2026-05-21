"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Users, UserPlus, UserCheck, Bell, Building2, Trash2, Loader2 } from "lucide-react";

interface Workspace { id: string; name: string; description: string | null; my_role: string; member_count: number; }
interface Member {
    id: string; role: string; status: string;
    user_id: string; name: string | null; email: string; account_status: string;
}

export default function GovernancePage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWs, setActiveWs] = useState<string>("");
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

    // Form state
    const [inviteEmail, setInviteEmail] = useState("");
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
    const [notif, setNotif] = useState({ title: "", message: "" });
    const [newWsName, setNewWsName] = useState("");

    const flash = (kind: 'ok' | 'err', text: string) => {
        setMsg({ kind, text });
        setTimeout(() => setMsg(null), 4000);
    };

    const loadWorkspaces = useCallback(async () => {
        const res = await fetch('/api/workspaces');
        const data = res.ok ? await res.json() : [];
        const govs: Workspace[] = (Array.isArray(data) ? data : []).filter((w: Workspace) => w.my_role === 'gestor');
        setWorkspaces(govs);
        setActiveWs((prev) => (prev && govs.some((w) => w.id === prev)) ? prev : (govs[0]?.id || ""));
        return govs;
    }, []);

    const loadMembers = useCallback(async (wsId: string) => {
        if (!wsId) { setMembers([]); return; }
        const res = await fetch(`/api/workspaces/${wsId}/members`);
        setMembers(res.ok ? await res.json() : []);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const me = await fetch('/api/auth/me');
                const meData = me.ok ? await me.json() : null;
                setIsAdmin(meData?.user?.role === 'admin');
                await loadWorkspaces();
            } finally {
                setLoading(false);
            }
        })();
    }, [loadWorkspaces]);

    useEffect(() => { loadMembers(activeWs); }, [activeWs, loadMembers]);

    const memberAction = async (action: string, payload: Record<string, unknown>) => {
        setBusy(true);
        try {
            const res = await fetch(`/api/workspaces/${activeWs}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...payload }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                flash('ok', 'Listo');
                await loadMembers(activeWs);
                await loadWorkspaces();
            } else {
                flash('err', data.error || 'No se pudo completar la acción');
            }
            return res.ok;
        } finally {
            setBusy(false);
        }
    };

    const sendNotification = async () => {
        if (!notif.title.trim() || !notif.message.trim()) return flash('err', 'Título y mensaje son obligatorios');
        setBusy(true);
        try {
            const res = await fetch(`/api/workspaces/${activeWs}/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notif),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                flash('ok', `Notificación enviada a ${data.recipients ?? 0} miembros`);
                setNotif({ title: "", message: "" });
            } else {
                flash('err', data.error || 'No se pudo enviar');
            }
        } finally {
            setBusy(false);
        }
    };

    const createWorkspace = async () => {
        if (!newWsName.trim()) return flash('err', 'Nombre requerido');
        setBusy(true);
        try {
            const res = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newWsName }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) { flash('ok', 'Workspace creado'); setNewWsName(""); await loadWorkspaces(); }
            else flash('err', data.error || 'No se pudo crear');
        } finally {
            setBusy(false);
        }
    };

    const card: React.CSSProperties = { padding: 20, display: 'flex', flexDirection: 'column', gap: 14 };
    const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 8 };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={28} style={{ color: 'var(--primary)' }} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: 'max(24px, var(--safe-top)) 20px 60px' }}>
            <div style={{ maxWidth: 960, margin: '0 auto' }}>
                <Link href="/workspace" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', textDecoration: 'none', fontSize: 14, marginBottom: 20 }}>
                    <ArrowLeft size={18} /> Volver al espacio de trabajo
                </Link>

                <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>Gobernanza</h1>
                <p style={{ color: 'var(--text-dim)', margin: '0 0 24px', fontSize: 14 }}>
                    Administra los miembros y las notificaciones de tus workspaces.
                </p>

                {msg && (
                    <div style={{
                        marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: msg.kind === 'ok' ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                        color: msg.kind === 'ok' ? '#15803d' : '#dc2626',
                        border: `1px solid ${msg.kind === 'ok' ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}`
                    }}>{msg.text}</div>
                )}

                {isAdmin && (
                    <div className="glass-panel" style={{ ...card, marginBottom: 16 }}>
                        <div style={cardTitle}><Building2 size={15} /> Crear workspace (administrador)</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input className="input-glass" placeholder="Nombre del workspace" value={newWsName}
                                onChange={e => setNewWsName(e.target.value)} style={{ flex: '1 1 240px' }} />
                            <button className="btn-primary" onClick={createWorkspace} disabled={busy} style={{ padding: '8px 16px', fontSize: 13 }}>
                                Crear
                            </button>
                        </div>
                    </div>
                )}

                {workspaces.length === 0 ? (
                    <div className="glass-panel" style={{ ...card, textAlign: 'center', color: 'var(--text-dim)' }}>
                        No gobiernas ningún workspace todavía.
                    </div>
                ) : (
                    <>
                        {workspaces.length > 1 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                {workspaces.map(w => (
                                    <button key={w.id} onClick={() => setActiveWs(w.id)}
                                        style={{
                                            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                            border: activeWs === w.id ? '1px solid var(--primary)' : '1px solid var(--border-dim)',
                                            background: activeWs === w.id ? 'var(--primary-soft)' : 'var(--bg-card)',
                                            color: activeWs === w.id ? 'var(--primary)' : 'var(--text-main)'
                                        }}>
                                        {w.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: 16 }}>
                            {/* Members */}
                            <div className="glass-panel" style={card}>
                                <div style={cardTitle}><Users size={15} /> Miembros · {members.length}</div>
                                {members.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Sin miembros.</div>}
                                {members.map(m => (
                                    <div key={m.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                                        padding: '10px 0', borderBottom: '1px solid var(--border-dim)'
                                    }}>
                                        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name || m.email}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{m.email}</div>
                                        </div>
                                        {m.status === 'pending' ? (
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: 'rgba(180,83,9,0.12)', padding: '3px 8px', borderRadius: 999 }}>
                                                Pendiente
                                            </span>
                                        ) : (
                                            <select className="input-glass" value={m.role} disabled={busy}
                                                onChange={e => memberAction('set_role', { memberId: m.id, role: e.target.value })}
                                                style={{ width: 'auto', padding: '5px 8px', fontSize: 12 }}>
                                                <option value="member">Miembro</option>
                                                <option value="gestor">Gestor</option>
                                            </select>
                                        )}
                                        {m.status === 'pending' && (
                                            <button className="btn-primary" disabled={busy}
                                                onClick={() => memberAction('accept', { memberId: m.id })}
                                                style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <UserCheck size={13} /> Aceptar
                                            </button>
                                        )}
                                        <button className="btn-ghost" disabled={busy}
                                            onClick={() => memberAction('remove', { memberId: m.id })}
                                            title="Quitar del workspace"
                                            style={{ padding: 6, color: '#dc2626' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add users */}
                            <div className="glass-panel" style={card}>
                                <div style={cardTitle}><UserPlus size={15} /> Añadir usuarios</div>
                                <div>
                                    <label className="form-label">Invitar una cuenta existente</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                        <input className="input-glass" type="email" placeholder="correo@empresa.com" value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)} style={{ flex: '1 1 220px' }} />
                                        <button className="btn-ghost" disabled={busy}
                                            onClick={async () => { if (await memberAction('invite', { email: inviteEmail })) setInviteEmail(""); }}
                                            style={{ padding: '8px 14px', fontSize: 13 }}>Invitar</button>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 12 }}>
                                    <label className="form-label">Crear un usuario nuevo</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 4 }}>
                                        <input className="input-glass" placeholder="Nombre" value={newUser.name}
                                            onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                                        <input className="input-glass" type="email" placeholder="Correo" value={newUser.email}
                                            onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                                        <input className="input-glass" type="password" placeholder="Contraseña" value={newUser.password}
                                            onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                                    </div>
                                    <button className="btn-primary" disabled={busy}
                                        onClick={async () => { if (await memberAction('create', newUser)) setNewUser({ name: "", email: "", password: "" }); }}
                                        style={{ padding: '8px 16px', fontSize: 13, marginTop: 8 }}>Crear usuario</button>
                                </div>
                            </div>

                            {/* Notification */}
                            <div className="glass-panel" style={card}>
                                <div style={cardTitle}><Bell size={15} /> Enviar notificación al workspace</div>
                                <input className="input-glass" placeholder="Título" value={notif.title}
                                    onChange={e => setNotif({ ...notif, title: e.target.value })} />
                                <textarea className="input-glass" placeholder="Mensaje" rows={3} value={notif.message}
                                    onChange={e => setNotif({ ...notif, message: e.target.value })} />
                                <button className="btn-primary" onClick={sendNotification} disabled={busy}
                                    style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: 13 }}>Enviar</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
