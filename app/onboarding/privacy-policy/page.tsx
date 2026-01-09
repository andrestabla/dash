'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PrivacyPolicyContent from '@/components/PrivacyPolicyContent';

export default function PrivacyPolicyPage() {
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        // Fetch current user status
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    setUser(data.user);
                    if (data.user.accepted_privacy_policy) {
                        router.push('/workspace');
                    }
                } else {
                    router.push('/login');
                }
            });
    }, [router]);

    const handleAccept = async () => {
        if (!accepted) {
            setError('Debes marcar la casilla para continuar');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/accept-policy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accepted: true })
            });

            const data = await res.json();

            if (res.ok) {
                router.push('/workspace');
            } else {
                setError(data.error || 'Error al procesar la aceptación');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-[#161618] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500">
                {/* Header */}
                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Privacidad y Tratamiento de Datos
                    </h1>
                    <p className="text-white/40 mt-2">
                        Bienvenido, {user.name}. Por favor revisa y acepta nuestros términos para continuar.
                    </p>
                </div>

                {/* Content */}
                <div className="p-8 max-h-[400px] overflow-y-auto custom-scrollbar">
                    <PrivacyPolicyContent />
                </div>

                {/* Footer / Actions */}
                <div className="p-8 bg-white/[0.02] border-t border-white/5">
                    <div className="flex items-start gap-3 mb-6">
                        <input
                            type="checkbox"
                            id="accept"
                            className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 accent-blue-500 cursor-pointer"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                        />
                        <label htmlFor="accept" className="text-sm text-white/60 cursor-pointer select-none">
                            He leído y acepto la <span className="text-white">Política de Privacidad</span> y el <span className="text-white">Tratamiento de Datos Personales</span> de acuerdo con la ley vigente.
                        </label>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleAccept}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 ${loading
                            ? 'bg-white/10 text-white/30 cursor-not-allowed'
                            : 'bg-white text-black hover:bg-white/90 active:scale-[0.98] shadow-lg shadow-white/5'
                            }`}
                    >
                        {loading ? 'Procesando...' : 'Aceptar y Continuar'}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
