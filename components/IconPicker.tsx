"use client";

import { createElement, useMemo, useState, type ComponentType, type SVGProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { icons } from "lucide-react";

type LucideIconProps = SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number; color?: string };
type LucideIconComponent = ComponentType<LucideIconProps>;

// `icons` re-exports the same component under several aliases (kebab/Pascal
// variants, legacy names). Dedupe by component identity and PascalCase only so
// each glyph appears once in the picker.
const ALL_NAMES: string[] = (() => {
    const seen = new Map<unknown, string>();
    for (const name of Object.keys(icons)) {
        if (!/^[A-Z]/.test(name)) continue;
        const component = (icons as unknown as Record<string, LucideIconComponent>)[name];
        if (!seen.has(component)) seen.set(component, name);
    }
    return Array.from(seen.values()).sort();
})();

const MAX_VISIBLE = 240;

// Renders a lucide icon to a self-contained SVG string. The width/height are
// switched to 100% so the saved icon scales to its node, and `stroke` stays as
// `currentColor` so the canvas can recolour it through the container.
export function lucideToSvgString(name: string): string | null {
    const Component = (icons as unknown as Record<string, LucideIconComponent | undefined>)[name];
    if (!Component) return null;
    const html = renderToStaticMarkup(createElement(Component, { size: 48, strokeWidth: 1.75, color: "currentColor" }));
    return html
        .replace(/\swidth="[^"]*"/, ' width="100%"')
        .replace(/\sheight="[^"]*"/, ' height="100%"');
}

type Props = {
    onPick: (svg: string, name: string) => void;
    onClose: () => void;
};

export default function IconPicker({ onPick, onClose }: Props) {
    const [query, setQuery] = useState("");

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q ? ALL_NAMES.filter((name) => name.toLowerCase().includes(q)) : ALL_NAMES;
        return filtered.slice(0, MAX_VISIBLE);
    }, [query]);

    return (
        <div
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1100,
                background: "rgba(15,23,42,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16
            }}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                style={{
                    width: "min(720px, 100%)",
                    maxHeight: "88vh",
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--bg-card)",
                    color: "var(--text-main, #0f172a)",
                    borderRadius: 16,
                    border: "1px solid var(--border-dim)",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                    overflow: "hidden"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderBottom: "1px solid var(--border-dim)" }}>
                    <strong style={{ fontSize: 14 }}>Insertar ícono</strong>
                    <input
                        autoFocus
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar ícono..."
                        className="input-glass"
                        style={{ flex: 1, padding: "8px 12px", fontSize: 14 }}
                    />
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 20, color: "var(--text-dim)" }}
                    >
                        ✕
                    </button>
                </div>

                <div
                    style={{
                        overflowY: "auto",
                        padding: 12,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
                        gap: 6
                    }}
                >
                    {visible.map((name) => {
                        const Component = (icons as unknown as Record<string, LucideIconComponent>)[name];
                        return (
                            <button
                                key={name}
                                type="button"
                                onClick={() => {
                                    const svg = lucideToSvgString(name);
                                    if (svg) onPick(svg, name);
                                }}
                                title={name}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: 8,
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    border: "1px solid var(--border-dim)",
                                    background: "var(--bg-card)",
                                    color: "inherit"
                                }}
                            >
                                <Component size={22} strokeWidth={1.75} />
                                <span style={{ fontSize: 9, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{name}</span>
                            </button>
                        );
                    })}
                    {visible.length === 0 && (
                        <div style={{ gridColumn: "1 / -1", padding: 24, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
                            Sin resultados
                        </div>
                    )}
                </div>

                <div style={{ padding: "8px 14px 12px", fontSize: 11, color: "var(--text-dim)", textAlign: "center", borderTop: "1px solid var(--border-dim)" }}>
                    {query.trim()
                        ? `${visible.length} resultado${visible.length === 1 ? "" : "s"}`
                        : `Mostrando ${visible.length} de ${ALL_NAMES.length} íconos. Escribe para filtrar.`}
                </div>
            </div>
        </div>
    );
}
