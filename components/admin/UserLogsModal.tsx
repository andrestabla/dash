import { useState, useEffect, useCallback } from "react";
import { X, Clock, User, Activity } from "lucide-react";

interface Log {
    id: string;
    action: string;
    details: string;
    created_at: string;
    performed_by_name: string;
    performed_by_email: string;
}

interface UserLogsModalProps {
    isOpen: boolean;
    userId: string | null;
    userName: string;
    onClose: () => void;
}

export default function UserLogsModal({ isOpen, userId, userName, onClose }: UserLogsModalProps) {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLogs = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users/logs?userId=${userId}`);
            if (res.ok) {
                setLogs(await res.json());
            }
        } catch {
            console.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (isOpen && userId) {
            fetchLogs();
        } else {
            setLogs([]);
        }
    }, [isOpen, userId, fetchLogs]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000
        }}>
            <div style={{
                background: "var(--bg-panel)", width: "100%", maxWidth: 600, maxHeight: "80vh",
                borderRadius: 16, border: "1px solid var(--border-dim)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                display: "flex", flexDirection: "column"
            }}>
                <div style={{
                    padding: "20px 24px", borderBottom: "1px solid var(--border-dim)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    flexShrink: 0
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Registro de Actividad</h3>
                        <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-dim)" }}>
                            Historial para: <span style={{ color: "var(--text-main)", fontWeight: 500 }}>{userName || "Usuario"}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: 4 }}><X size={20} /></button>
                </div>

                <div style={{ padding: 0, overflowY: "auto", flexGrow: 1 }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>Cargando actividad...</div>
                    ) : logs.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>No hay actividad registrada.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            {logs.map((log) => (
                                <div key={log.id} style={{
                                    padding: "16px 24px",
                                    borderBottom: "1px solid var(--border-dim)",
                                    display: "flex", gap: 16, alignItems: "flex-start"
                                }}>
                                    <div style={{
                                        minWidth: 32, height: 32, borderRadius: "50%",
                                        background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        marginTop: 2
                                    }}>
                                        <Activity size={16} />
                                    </div>
                                    <div style={{ flexGrow: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600, fontSize: 14 }}>{log.action}</span>
                                            <span style={{ fontSize: 12, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 4 }}>
                                                <Clock size={12} />
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p style={{ margin: "0 0 6px 0", fontSize: 13, color: "var(--text-dim)" }}>{log.details}</p>
                                        <div style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 6, opacity: 0.7 }}>
                                            <User size={10} /> Por: {log.performed_by_name || log.performed_by_email || "Sistema/Desconocido"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
