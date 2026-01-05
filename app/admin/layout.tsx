"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const menu = [
        { name: '👥 Usuarios', href: '/admin/users', icon: '👤' },
        { name: '📊 Tableros', href: '/admin/dashboards', icon: '📈' },
        { name: '⚙️ Configuración', href: '/admin/settings', icon: '⚙️' },
        { name: '🔔 Notificaciones', href: '/admin/notifications', icon: '🔔' },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'radial-gradient(circle at top left, #1e1b4b 0%, #0f172a 100%)', color: 'var(--text-main)' }}>

            {/* SIDEBAR */}
            <aside className="glass-panel" style={{
                width: 260,
                margin: 16,
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(15, 23, 42, 0.6)'
            }}>
                <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-main)' }}>
                        <span style={{ fontSize: 20 }}>⬅️</span>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Regresar a</div>
                            <div style={{ fontWeight: 700 }}>Workspace</div>
                        </div>
                    </Link>
                </div>

                <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Admin Suite
                    </div>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {menu.map(item => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '12px 16px',
                                        borderRadius: 12,
                                        background: isActive ? 'var(--primary-gradient)' : 'transparent',
                                        color: isActive ? 'white' : 'var(--text-dim)',
                                        fontWeight: isActive ? 600 : 500,
                                        textDecoration: 'none',
                                        transition: 'all 0.2s',
                                        boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                                    }}
                                >
                                    <span>{item.icon}</span>
                                    <span>{item.name}</span>
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                <div style={{ marginTop: 'auto', padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-dim)' }}>
                    Roadmap 4Shine Admin<br />v9.0 Premium
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main style={{ flex: 1, padding: '16px 16px 16px 0', overflow: 'hidden', display: 'flex' }}>
                <div className="glass-panel" style={{ flex: 1, padding: 40, overflowY: 'auto', borderRadius: 24, background: 'rgba(30, 41, 59, 0.4)' }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
