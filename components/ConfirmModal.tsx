"use client";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    isDestructive = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="backdrop fade-in" style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000,
            backdropFilter: 'blur(4px)',
            padding: 'max(12px, var(--safe-top)) max(12px, var(--safe-right)) max(12px, var(--safe-bottom)) max(12px, var(--safe-left))',
            overflowY: 'auto'
        }}>
            <div
                className="glass-panel animate-slide-up"
                style={{
                    width: 'min(400px, 100%)',
                    padding: 'clamp(20px, 4vw, 32px)',
                    textAlign: 'center',
                    background: 'var(--bg-card)'
                }}
            >
                <h3 style={{ margin: '0 0 12px 0', fontSize: 20 }}>{title}</h3>
                <p style={{ color: 'var(--text-dim)', margin: '0 0 24px 0', lineHeight: 1.5 }}>{message}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                    <button className="btn-ghost" onClick={onCancel} style={{ flex: '1 1 140px' }}>{cancelText}</button>
                    <button
                        className="btn-primary"
                        onClick={onConfirm}
                        style={{ flex: '1 1 140px', ...(isDestructive ? { background: 'var(--danger-gradient)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' } : {}) }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
