"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const menu = [
        { name: '👥 Usuarios', href: '/admin/users' },
        { name: '📊 Tableros', href: '/admin/dashboards' },
        { name: '⚙️ Configuración', href: '/admin/settings' },
        { name: '🔔 Notificaciones', href: '/admin/notifications' },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
            <aside style={{ width: 250, background: 'var(--panel)', borderRight: '1px solid var(--border)', padding: 20 }}>
                <div style={{ marginBottom: 30, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                    <Link href="/" style={{ fontSize: 18, fontWeight: 700, textDecoration: 'none', color: 'var(--text)' }}>
                        ⬅️ Volver a App
                    </Link>
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 10, textTransform: 'uppercase' }}>Administración</div>
                    {menu.map(item => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: 'block',
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    background: isActive ? 'var(--primary-light)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text)',
                                    fontWeight: isActive ? 600 : 400,
                                    textDecoration: 'none',
                                    transition: 'background 0.2s'
                                }}
                            >
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </aside>
            <main style={{ flex: 1, padding: 40, overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    );
}
