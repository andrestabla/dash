"use client";

import { useState } from "react";
import dagre from "dagre";
import { parseMermaidFlowchart } from "@/lib/canvas-mermaid";
import type { CanvasEdge, CanvasNode, CanvasPort } from "@/lib/canvas";

type Props = {
    accentColor: string;
    onClose: () => void;
    onApply: (nodes: CanvasNode[], edges: CanvasEdge[]) => void;
};

// Default size used for layout. The renderer happily uses these straight from
// the layout so user-visible boxes match what dagre planned around.
const DEFAULT_NODE_WIDTH = 240;
const MIN_NODE_HEIGHT = 96;
const LINE_HEIGHT = 22;
const VERTICAL_PADDING = 36;

function estimateHeight(label: string): number {
    const lines = label.split("\n").length;
    return Math.max(MIN_NODE_HEIGHT, lines * LINE_HEIGHT + VERTICAL_PADDING);
}

function inferPortPair(src: { x: number; y: number }, tgt: { x: number; y: number }): { source: CanvasPort; target: CanvasPort } {
    const dx = tgt.x - src.x;
    const dy = tgt.y - src.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
        return dx >= 0 ? { source: "right", target: "left" } : { source: "left", target: "right" };
    }
    return dy >= 0 ? { source: "bottom", target: "top" } : { source: "top", target: "bottom" };
}

const EXAMPLE = `flowchart LR
A[Idea inicial] --> B(Validación)
B --> C{¿Cumple\\nrequisitos?}
C -- "sí" --> D[/Lanzar piloto/]
C -- "no" --> E[Iterar]
D --> F((Éxito))
E --> B`;

export default function SchemaCodeModal({ accentColor, onClose, onApply }: Props) {
    const [code, setCode] = useState(EXAMPLE);
    const [error, setError] = useState<string | null>(null);

    const handleInsert = () => {
        try {
            const parsed = parseMermaidFlowchart(code);
            if (parsed.nodes.length === 0) {
                setError("No se detectó ningún nodo en el código.");
                return;
            }

            const g = new dagre.graphlib.Graph();
            g.setGraph({ rankdir: parsed.direction, nodesep: 60, ranksep: 110, marginx: 0, marginy: 0 });
            g.setDefaultEdgeLabel(() => ({}));

            for (const n of parsed.nodes) {
                g.setNode(n.id, { width: DEFAULT_NODE_WIDTH, height: estimateHeight(n.label) });
            }
            for (const e of parsed.edges) {
                if (g.node(e.from) && g.node(e.to)) g.setEdge(e.from, e.to);
            }

            dagre.layout(g);

            const idMap = new Map<string, string>();
            const newNodes: CanvasNode[] = parsed.nodes.map((n) => {
                const layout = g.node(n.id);
                const w = DEFAULT_NODE_WIDTH;
                const h = estimateHeight(n.label);
                const newId = `node_${Math.random().toString(36).slice(2, 8)}`;
                idMap.set(n.id, newId);
                return {
                    id: newId,
                    type: n.type,
                    position: { x: Math.round(layout.x - w / 2), y: Math.round(layout.y - h / 2) },
                    size: { width: w, height: h },
                    style: { fill: accentColor, radius: 12, fontScale: "md" },
                    content: n.label
                };
            });

            // Pick ports per edge from the dagre-computed positions instead of
            // a fixed direction — that way feedback edges (e.g. `E --> B` in a
            // loop) leave from the side closest to the target.
            const layoutById = new Map<string, { x: number; y: number }>();
            for (const n of parsed.nodes) {
                const l = g.node(n.id);
                if (l) layoutById.set(n.id, { x: l.x, y: l.y });
            }
            const newEdges: CanvasEdge[] = parsed.edges
                .filter((e) => idMap.has(e.from) && idMap.has(e.to))
                .map((e) => {
                    const src = layoutById.get(e.from) ?? { x: 0, y: 0 };
                    const tgt = layoutById.get(e.to) ?? { x: 0, y: 0 };
                    const ports = inferPortPair(src, tgt);
                    return {
                        id: `edge_${Math.random().toString(36).slice(2, 8)}`,
                        type: "connector" as const,
                        source: { nodeId: idMap.get(e.from)!, port: ports.source },
                        target: { nodeId: idMap.get(e.to)!, port: ports.target },
                        lineStyle: "orthogonal" as const,
                        startArrow: false,
                        endArrow: e.arrow,
                        text: e.label,
                        dashed: e.dashed || undefined
                    };
                });

            onApply(newNodes, newEdges);
        } catch (err) {
            console.error("Schema parse error:", err);
            setError(err instanceof Error ? err.message : "No se pudo interpretar el código.");
        }
    };

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
                    width: "min(760px, 100%)",
                    maxHeight: "92vh",
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--border-dim)" }}>
                    <strong style={{ fontSize: 14 }}>Crear esquema desde código</strong>
                    <button type="button" onClick={onClose} aria-label="Cerrar" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 20, color: "var(--text-dim)" }}>✕</button>
                </div>

                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
                        Pega un flowchart en sintaxis tipo <strong>Mermaid</strong>. Soporta direcciones <code>LR</code>, <code>TB</code>, <code>RL</code>, <code>BT</code>; formas <code>[texto]</code>, <code>(texto)</code>, <code>{"{texto}"}</code>, <code>((texto))</code>, <code>[/texto/]</code>; conexiones <code>--&gt;</code>, <code>---</code>, <code>-.-&gt;</code> y etiquetas <code>--&gt;|texto|</code>. Usa <code>\n</code> para saltos de línea.
                    </p>
                    <textarea
                        value={code}
                        onChange={(event) => { setCode(event.target.value); setError(null); }}
                        spellCheck={false}
                        style={{
                            width: "100%",
                            minHeight: 240,
                            padding: 12,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            fontSize: 13,
                            lineHeight: 1.5,
                            background: "var(--bg-panel)",
                            color: "var(--text-main, #0f172a)",
                            border: "1px solid var(--border-dim)",
                            borderRadius: 10,
                            resize: "vertical"
                        }}
                    />
                    {error && (
                        <div style={{ padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", color: "#dc2626", fontSize: 12 }}>
                            {error}
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--border-dim)" }}>
                    <button type="button" onClick={onClose} className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }}>Cancelar</button>
                    <button type="button" onClick={handleInsert} className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>Insertar esquema</button>
                </div>
            </div>
        </div>
    );
}
