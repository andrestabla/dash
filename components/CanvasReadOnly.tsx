"use client";

import { useMemo } from "react";
import type { CanvasDocument } from "@/lib/canvas";
import { getPortPoint, normalizeCanvasDocument } from "@/lib/canvas";

const GRID_WIDTH = 2200;
const GRID_HEIGHT = 1400;

function pointsToPath(points: { x: number; y: number }[]) {
    if (points.length === 0) return '';
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function edgePoints(doc: CanvasDocument, edgeId: string) {
    const edge = doc.edges.find((e) => e.id === edgeId);
    if (!edge) return [];
    const source = doc.nodes.find((n) => n.id === edge.source.nodeId);
    const target = doc.nodes.find((n) => n.id === edge.target.nodeId);
    if (!source || !target) return [];

    const start = getPortPoint(source, edge.source.port);
    const end = getPortPoint(target, edge.target.port);

    if (edge.lineStyle === 'straight') return [start, end];
    const mid = { x: end.x, y: start.y };
    return [start, mid, end];
}

export default function CanvasReadOnly({ document }: { document: CanvasDocument }) {
    const doc = useMemo(() => normalizeCanvasDocument(document), [document]);

    return (
        <div
            style={{
                position: 'relative',
                overflow: 'auto',
                borderRadius: 16,
                border: '1px solid rgba(148,163,184,0.35)',
                minHeight: 520,
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.35) 1px, transparent 0)',
                backgroundSize: '24px 24px',
                backgroundColor: '#ffffff'
            }}
        >
            <svg width={GRID_WIDTH} height={GRID_HEIGHT} style={{ position: 'absolute', inset: 0 }}>
                {doc.edges.map((edge) => {
                    const points = edgePoints(doc, edge.id);
                    if (points.length < 2) return null;
                    const center = points[Math.floor(points.length / 2)];
                    return (
                        <g key={edge.id}>
                            <path d={pointsToPath(points)} stroke="#64748b" strokeWidth={2} fill="none" />
                            {edge.text && <text x={center.x + 6} y={center.y - 6} fontSize="12" fill="#334155">{edge.text}</text>}
                        </g>
                    );
                })}
            </svg>

            <div style={{ position: 'relative', width: GRID_WIDTH, height: GRID_HEIGHT }}>
                {doc.nodes.map((node) => (
                    <div
                        key={node.id}
                        style={{
                            position: 'absolute',
                            left: node.position.x,
                            top: node.position.y,
                            width: node.size.width,
                            height: node.size.height,
                            borderRadius: node.type === 'circle' ? '9999px' : node.style.radius,
                            background: node.style.fill || '#3b82f6',
                            color: '#fff',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                            border: '1px solid rgba(255,255,255,0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: 10,
                            fontWeight: 700,
                            userSelect: 'none',
                            clipPath: node.type === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'none'
                        }}
                    >
                        <span style={{ transform: node.type === 'diamond' ? 'scale(0.88)' : 'none' }}>{node.content}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
