"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok) {
            router.push("/");
            router.refresh();
        } else {
            setError(data.error || "Login failed");
        }
    };

    return (
        <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
            <form onSubmit={handleSubmit} style={{ background: "var(--panel)", padding: 40, borderRadius: 16, width: 400, border: "1px solid var(--border)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
                <div style={{ textAlign: "center", marginBottom: 30 }}>
                    <img src="https://www.algoritmot.com/wp-content/uploads/2022/08/Recurso-8-1536x245.png" alt="Logo" style={{ height: 40, marginBottom: 20 }} />
                    <h1 style={{ fontSize: 24, margin: 0 }}>Bienvenido</h1>
                    <p style={{ color: "var(--text-dim)" }}>Inicia sesión para continuar</p>
                </div>

                {error && (
                    <div style={{ background: "#fef2f2", color: "#ef4444", padding: 10, borderRadius: 8, marginBottom: 20, fontSize: 14, textAlign: "center" }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}
                    />
                </div>

                <div style={{ marginBottom: 25 }}>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Contraseña</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}
                    />
                </div>

                <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: 14 }}>
                    Ingresar
                </button>
            </form>
        </div>
    );
}
