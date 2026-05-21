"use client";

import Link from "next/link";
import Script from "next/script";
import { Heart, ArrowLeft } from "lucide-react";

export default function DonationsPage() {
    return (
        <div className="min-h-screen bg-[#f6f7f9] text-[#1a1d21] font-outfit flex flex-col">
            {/* PayPal SDK */}
            <Script
                src="https://www.paypal.com/sdk/js?client-id=BAAFPQ53fCUii64rB81xBDaF90__d0927m9zxq2uQL6X_7o66y3UK1YBc0RSc0gx70Qok9W8uS3OV53ybE&components=hosted-buttons&disable-funding=venmo&currency=USD&locale=es_ES"
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
            <header className="py-6 border-b border-[#e4e6e9]">
                <div className="container mx-auto px-6">
                    <Link href="/" className="inline-flex items-center text-slate-500 hover:text-[#1a1d21] transition-colors">
                        <ArrowLeft className="mr-2" size={20} /> Volver al Inicio
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-xl w-full">
                    <div className="glass-panel p-10 rounded-3xl text-center animate-fade-in">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                            <Heart size={32} />
                        </div>

                        <h1 className="text-4xl font-bold mb-4">Apóyanos</h1>
                        <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                            Si nuestra plataforma te ha sido útil, considera hacer una donación.
                            Tu apoyo nos permite mantener los servidores activos y seguir desarrollando nuevas funcionalidades gratuitas.
                        </p>

                        {/* PayPal Container */}
                        <div className="w-full flex justify-center mt-6">
                            <div id="paypal-container-46PV99WC22VPQ" className="relative z-10 w-full max-w-md min-h-[150px]"></div>
                        </div>

                        <p className="text-slate-500 text-sm mt-8">
                            Transacción segura procesada directamente por PayPal.
                        </p>
                    </div>
                </div>
            </main>

            <style jsx global>{`
        .font-outfit { font-family: 'Outfit', sans-serif; }
        .glass-panel {
            background: #ffffff;
            border: 1px solid #e4e6e9;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s ease-out; }
      `}</style>
        </div>
    );
}
