import { useState, useEffect } from "react";
import { X, Save, Lock, Send, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
}

interface EditUserModalProps {
    isOpen: boolean;
    user: User | null;
    onClose: () => void;
    onSave: () => void;
}

export default function EditUserModal({ isOpen, user, onClose, onSave }: EditUserModalProps) {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("user");
    const [password, setPassword] = useState("");
    const [resendCredentials, setResendCredentials] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (user) {
            setEmail(user.email);
            setName(user.name || "");
            setRole(user.role);
            setPassword("");
            setResendCredentials(false);
        }
    }, [user, isOpen]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const res = await fetch("/api/admin/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: user.id,
                    email,
                    name,
                    role,
                    password: password || undefined,
                    resendCredentials: password ? resendCredentials : false
                }),
            });

            if (res.ok) {
                showToast("Usuario actualizado correctamente", "success");
                onSave();
                onClose();
            } else {
                showToast("Error al actualizar usuario", "error");
            }
        } catch {
            showToast("Error de conexión", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000
        }}>
            <div style={{
                background: "var(--bg-panel)", width: "100%", maxWidth: 500,
                borderRadius: 16, border: "1px solid var(--border-dim)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
            }}>
                <div style={{
                    padding: "20px 24px", borderBottom: "1px solid var(--border-dim)",
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Editar Usuario</h3>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: 4 }}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: 24 }}>
                    <div style={{ display: "grid", gap: 16 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-dim)" }}>Nombre</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ej: Juan Pérez"
                                style={{
                                    width: "100%", padding: "10px 12px", borderRadius: 8,
                                    background: "var(--bg-main)", border: "1px solid var(--border-dim)",
                                    color: "var(--text-main)", outline: "none"
                                }}
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-dim)" }}>Email</label>
                                <input
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    style={{
                                        width: "100%", padding: "10px 12px", borderRadius: 8,
                                        background: "var(--bg-main)", border: "1px solid var(--border-dim)",
                                        color: "var(--text-main)", outline: "none"
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-dim)" }}>Rol</label>
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    style={{
                                        width: "100%", padding: "10px 12px", borderRadius: 8,
                                        background: "var(--bg-main)", border: "1px solid var(--border-dim)",
                                        color: "var(--text-main)", outline: "none"
                                    }}
                                >
                                    <option value="user">Usuario (User)</option>
                                    <option value="admin">Administrador (Admin)</option>
                                </select>
                            </div>
                        </div>

                        <hr style={{ border: 0, borderTop: "1px solid var(--border-dim)", margin: "10px 0" }} />

                        <div style={{ background: "rgba(59, 130, 246, 0.05)", padding: 16, borderRadius: 8, border: "1px solid rgba(59, 130, 246, 0.1)" }}>
                            <h4 style={{ margin: "0 0 12px 0", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                                <Lock size={14} className="text-primary" /> Cambiar Contraseña (Opcional)
                            </h4>
                            <div style={{ display: "grid", gap: 12 }}>
                                <input
                                    type="text"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Nueva contraseña..."
                                    style={{
                                        width: "100%", padding: "10px 12px", borderRadius: 8,
                                        background: "var(--bg-main)", border: "1px solid var(--border-dim)",
                                        color: "var(--text-main)", outline: "none"
                                    }}
                                />
                                {password && (
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={resendCredentials}
                                            onChange={e => setResendCredentials(e.target.checked)}
                                        />
                                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <Send size={12} /> Enviar credenciales por correo
                                        </span>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                        <button type="button" className="btn-ghost" onClick={onClose} disabled={isSaving}>Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={isSaving} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isSaving ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
