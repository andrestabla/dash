"use client";

import Link from "next/link";
import Script from "next/script";
import { Heart, ArrowLeft } from "lucide-react";

export default function DonationsPage() {
    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-outfit flex flex-col">
            {/* PayPal SDK */}
            <Script
                src="https://www.paypal.com/sdk/js?client-id=BAAFPQ53fCUii64rB81xBDaF90__d0927m9zxq2uQL6X_7o66y3UK1YBc0RSc0gx70Qok9W8uS3OV53ybE&components=hosted-buttons&disable-funding=venmo&currency=USD"
                onLoad={() => {
                    if ((window as any).paypal) {
                        try {
                            (window as any).paypal.HostedButtons({
                                hostedButtonId: "46PV99WC22VPQ"
                            }).render("#paypal-container-46PV99WC22VPQ");
                        } catch (e) {
                            console.error("PayPal render error:", e);
                        }
                    }
                }}
            />

            {/* Header */}
            <header className="py-6 border-b border-white/5">
                <div className="container mx-auto px-6">
                    <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="mr-2" size={20} /> Volver al Inicio
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-xl w-full">
                    <div className="glass-panel p-10 rounded-3xl text-center shadow-glow animate-fade-in">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-500">
                            <Heart size={32} />
                        </div>

                        <h1 className="text-4xl font-bold mb-4">Apóyanos</h1>
                        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                            Si nuestra plataforma te ha sido útil, considera hacer una donación.
                            Tu apoyo nos permite mantener los servidores activos y seguir desarrollando nuevas funcionalidades gratuitas.
                        </p>

                        {/* PayPal Container */}
                        <div className="w-full flex justify-center mt-6">
                            <div id="paypal-container-46PV99WC22VPQ" className="relative z-10 w-full max-w-md min-h-[150px]"></div>
                        </div>

                        <p className="text-slate-600 text-sm mt-8">
                            Transacción segura procesada directamente por PayPal.
                        </p>
                    </div>
                </div>
            </main>

            <style jsx global>{`
        .font-outfit { font-family: 'Outfit', sans-serif; }
        .glass-panel { 
            background: rgba(255, 255, 255, 0.03); 
            border: 1px solid rgba(255, 255, 255, 0.05); 
            backdrop-filter: blur(10px); 
        }
        .shadow-glow { box-shadow: 0 0 40px rgba(59, 130, 246, 0.15); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s ease-out; }
      `}</style>
        </div>
    );
}
