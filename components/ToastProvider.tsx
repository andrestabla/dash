"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

const ToastContext = createContext<{
    showToast: (message: string, type?: ToastType) => void;
}>({
    showToast: () => { },
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                zIndex: 9999,
                pointerEvents: 'none'
            }}>
                {toasts.map((t) => (
                    <div key={t.id} className="glass-panel animate-slide-up" style={{
                        padding: '12px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: t.type === 'error' ? 'rgba(239, 68, 68, 0.9)' :
                            t.type === 'success' ? 'rgba(16, 185, 129, 0.9)' :
                                'rgba(30, 41, 59, 0.9)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.1)',
                        minWidth: 200,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                        pointerEvents: 'auto'
                    }}>
                        <span style={{ fontSize: 18 }}>
                            {t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : 'ℹ️'}
                        </span>
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
