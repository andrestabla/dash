"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CanvasDocument, CanvasEdge, CanvasNode, CanvasNodeStyle, CanvasPoint, CanvasPort, CanvasSize } from "@/lib/canvas";
import { getNearestPort, getNodeRect, getPortPoint, normalizeCanvasDocument } from "@/lib/canvas";

type Props = {
    canvasDocument: CanvasDocument;
    onChange: (next: CanvasDocument) => void;
    readOnly?: boolean;
    accentColor?: string;
};

type DragState = {
    nodeId: string;
    dx: number;
    dy: number;
};

type CanvasNodePatch = Partial<Omit<CanvasNode, 'position' | 'size' | 'style'>> & {
    position?: Partial<CanvasPoint>;
    size?: Partial<CanvasSize>;
    style?: Partial<CanvasNodeStyle>;
};

const GRID_WIDTH = 2200;
const GRID_HEIGHT = 1400;
const SNAP_THRESHOLD = 5;

function cloneDocument(doc: CanvasDocument): CanvasDocument {
    return {
        nodes: doc.nodes.map((node) => ({
            ...node,
            position: { ...node.position },
            size: { ...node.size },
            style: { ...node.style }
        })),
        edges: doc.edges.map((edge) => ({
            ...edge,
            source: { ...edge.source },
            target: { ...edge.target }
        })),
        updatedAt: doc.updatedAt
    };
}

function makeNodeId() {
    return `node_${Math.random().toString(36).slice(2, 8)}`;
}

function makeEdgeId() {
    return `edge_${Math.random().toString(36).slice(2, 8)}`;
}

function distance(a: CanvasPoint, b: CanvasPoint) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt((dx * dx) + (dy * dy));
}

function segmentIntersectsRect(a: CanvasPoint, b: CanvasPoint, rect: { x: number; y: number; width: number; height: number }): boolean {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);

    if (a.x === b.x) {
        if (a.x < rect.x || a.x > rect.x + rect.width) return false;
        return !(maxY < rect.y || minY > rect.y + rect.height);
    }

    if (a.y === b.y) {
        if (a.y < rect.y || a.y > rect.y + rect.height) return false;
        return !(maxX < rect.x || minX > rect.x + rect.width);
    }

    return false;
}

function pathHasCollision(points: CanvasPoint[], obstacles: CanvasNode[], sourceId: string, targetId: string): boolean {
    for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i];
        const b = points[i + 1];
        for (const node of obstacles) {
            if (node.id === sourceId || node.id === targetId) continue;
            const box = getNodeRect(node);
            const inflated = {
                x: box.x - 12,
                y: box.y - 12,
                width: box.width + 24,
                height: box.height + 24
            };
            if (segmentIntersectsRect(a, b, inflated)) return true;
        }
    }
    return false;
}

function buildOrthogonalPoints(edge: CanvasEdge, nodesById: Map<string, CanvasNode>, obstacles: CanvasNode[]): CanvasPoint[] {
    const sourceNode = nodesById.get(edge.source.nodeId);
    const targetNode = nodesById.get(edge.target.nodeId);
    if (!sourceNode || !targetNode) return [];

    const start = getPortPoint(sourceNode, edge.source.port);
    const end = getPortPoint(targetNode, edge.target.port);

    const hv = [start, { x: end.x, y: start.y }, end];
    if (!pathHasCollision(hv, obstacles, sourceNode.id, targetNode.id)) return hv;

    const vh = [start, { x: start.x, y: end.y }, end];
    if (!pathHasCollision(vh, obstacles, sourceNode.id, targetNode.id)) return vh;

    const horizontalDominant = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
    if (horizontalDominant) {
        const dir = end.x >= start.x ? 1 : -1;
        const midX = ((start.x + end.x) / 2) + (dir * 48);
        return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
    }

    const dir = end.y >= start.y ? 1 : -1;
    const midY = ((start.y + end.y) / 2) + (dir * 48);
    return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
}

function pointsToPath(points: CanvasPoint[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

export default function CollaborativeCanvas({ canvasDocument, onChange, readOnly = false, accentColor = '#3b82f6' }: Props) {
    const normalizedExternalDoc = useMemo(() => normalizeCanvasDocument(canvasDocument), [canvasDocument]);
    const [localDoc, setLocalDoc] = useState<CanvasDocument>(() => cloneDocument(normalizedExternalDoc));
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [linkFrom, setLinkFrom] = useState<{ nodeId: string; port: CanvasPort } | null>(null);

    const dragRef = useRef<DragState | null>(null);
    const canvasRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const incoming = cloneDocument(normalizedExternalDoc);
        setLocalDoc(incoming);
        if (selectedNodeId && !incoming.nodes.some((node) => node.id === selectedNodeId)) {
            setSelectedNodeId(null);
        }
    }, [normalizedExternalDoc, selectedNodeId]);

    const nodesById = useMemo(
        () => new Map(localDoc.nodes.map((node) => [node.id, node] as const)),
        [localDoc.nodes]
    );

    const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) || null : null;

    const commit = (doc: CanvasDocument) => {
        const withTimestamp = { ...doc, updatedAt: new Date().toISOString() };
        setLocalDoc(withTimestamp);
        onChange(withTimestamp);
    };

    const applyMagneticSnap = (nodeId: string, position: CanvasPoint): CanvasPoint => {
        const snapped = { ...position };
        for (const node of localDoc.nodes) {
            if (node.id === nodeId) continue;
            if (Math.abs(snapped.x - node.position.x) <= SNAP_THRESHOLD) {
                snapped.x = node.position.x;
            }
            if (Math.abs(snapped.y - node.position.y) <= SNAP_THRESHOLD) {
                snapped.y = node.position.y;
            }
        }
        return snapped;
    };

    const updateNode = (nodeId: string, patch: CanvasNodePatch) => {
        const next = cloneDocument(localDoc);
        next.nodes = next.nodes.map((node) => {
            if (node.id !== nodeId) return node;
            return {
                ...node,
                ...patch,
                position: patch.position ? { ...node.position, ...patch.position } : node.position,
                size: patch.size ? { ...node.size, ...patch.size } : node.size,
                style: patch.style ? { ...node.style, ...patch.style } : node.style
            };
        });
        commit(next);
    };

    const addNode = (x = 240, y = 180) => {
        if (readOnly) return;
        const next = cloneDocument(localDoc);
        next.nodes.push({
            id: makeNodeId(),
            type: 'rectangle',
            position: { x, y },
            size: { width: 220, height: 88 },
            style: { fill: accentColor, radius: 12 },
            content: 'Nuevo nodo'
        });
        commit(next);
    };

    const deleteSelectedNode = () => {
        if (readOnly || !selectedNodeId) return;
        const next = cloneDocument(localDoc);
        next.nodes = next.nodes.filter((node) => node.id !== selectedNodeId);
        next.edges = next.edges.filter((edge) => edge.source.nodeId !== selectedNodeId && edge.target.nodeId !== selectedNodeId);
        setSelectedNodeId(null);
        setLinkFrom(null);
        commit(next);
    };

    const onCanvasDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        addNode(event.clientX - rect.left - 110, event.clientY - rect.top - 44);
    };

    const onNodeMouseDown = (event: React.MouseEvent<HTMLDivElement>, node: CanvasNode) => {
        if (readOnly) return;
        event.stopPropagation();

        if (linkFrom) {
            if (linkFrom.nodeId !== node.id) {
                const sourceNode = nodesById.get(linkFrom.nodeId);
                if (sourceNode) {
                    const sourcePoint = getPortPoint(sourceNode, linkFrom.port);
                    const targetPort = getNearestPort(node, sourcePoint);
                    const exists = localDoc.edges.some((edge) =>
                        edge.source.nodeId === linkFrom.nodeId &&
                        edge.target.nodeId === node.id &&
                        edge.source.port === linkFrom.port &&
                        edge.target.port === targetPort
                    );
                    if (!exists) {
                        const next = cloneDocument(localDoc);
                        next.edges.push({
                            id: makeEdgeId(),
                            type: 'connector',
                            source: { nodeId: linkFrom.nodeId, port: linkFrom.port },
                            target: { nodeId: node.id, port: targetPort },
                            lineStyle: 'orthogonal'
                        });
                        commit(next);
                    }
                }
            }
            setLinkFrom(null);
            setSelectedNodeId(node.id);
            return;
        }

        setSelectedNodeId(node.id);
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        dragRef.current = {
            nodeId: node.id,
            dx: event.clientX - rect.left - node.position.x,
            dy: event.clientY - rect.top - node.position.y
        };
    };

    useEffect(() => {
        const onMouseMove = (event: MouseEvent) => {
            if (readOnly || !dragRef.current || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const { nodeId, dx, dy } = dragRef.current;
            const raw = {
                x: Math.max(8, event.clientX - rect.left - dx),
                y: Math.max(8, event.clientY - rect.top - dy)
            };
            const snapped = applyMagneticSnap(nodeId, raw);
            updateNode(nodeId, { position: snapped });
        };

        const onMouseUp = () => {
            dragRef.current = null;
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [readOnly, localDoc]);

    const removeEdge = (edgeId: string) => {
        if (readOnly) return;
        const next = cloneDocument(localDoc);
        next.edges = next.edges.filter((edge) => edge.id !== edgeId);
        commit(next);
    };

    const exportAsPng = () => {
        const doc = normalizeCanvasDocument(localDoc);
        const canvas = document.createElement('canvas');
        const width = 1800;
        const height = 1100;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const nodesMap = new Map(doc.nodes.map((node) => [node.id, node] as const));

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        doc.edges.forEach((edge) => {
            const points = buildOrthogonalPoints(edge, nodesMap, doc.nodes);
            if (points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i += 1) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
        });

        doc.nodes.forEach((node) => {
            ctx.fillStyle = node.style.fill || '#3b82f6';
            ctx.fillRect(node.position.x, node.position.y, node.size.width, node.size.height);
            ctx.strokeStyle = '#0f172a';
            ctx.strokeRect(node.position.x, node.position.y, node.size.width, node.size.height);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.content.slice(0, 30), node.position.x + 14, node.position.y + node.size.height / 2);
        });

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `canvas-${Date.now()}.png`;
        link.click();
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12, height: '100%' }}>
            <div
                ref={canvasRef}
                onClick={() => {
                    setSelectedNodeId(null);
                    if (!readOnly) setLinkFrom(null);
                }}
                onDoubleClick={onCanvasDoubleClick}
                style={{
                    position: 'relative',
                    overflow: 'auto',
                    borderRadius: 16,
                    border: '1px solid var(--border-dim)',
                    minHeight: 520,
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.35) 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                    backgroundColor: 'var(--bg-card)'
                }}
            >
                <svg width={GRID_WIDTH} height={GRID_HEIGHT} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {localDoc.edges.map((edge) => {
                        const points = buildOrthogonalPoints(edge, nodesById, localDoc.nodes);
                        if (points.length === 0) return null;
                        const pathData = pointsToPath(points);
                        const middle = points[Math.floor(points.length / 2)];

                        return (
                            <g key={edge.id}>
                                <path d={pathData} stroke="#64748b" strokeWidth={2} fill="none" />
                                {edge.text && (
                                    <text x={middle.x + 6} y={middle.y - 6} fontSize="12" fill="#334155" pointerEvents="none">{edge.text}</text>
                                )}
                                {!readOnly && (
                                    <foreignObject
                                        x={middle.x - 12}
                                        y={middle.y - 12}
                                        width={24}
                                        height={24}
                                        style={{ pointerEvents: 'auto' }}
                                    >
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                removeEdge(edge.id);
                                            }}
                                            style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: 12,
                                                border: 'none',
                                                cursor: 'pointer',
                                                background: 'rgba(239,68,68,0.9)',
                                                color: 'white',
                                                fontSize: 12
                                            }}
                                            title="Eliminar conexión"
                                        >
                                            x
                                        </button>
                                    </foreignObject>
                                )}
                            </g>
                        );
                    })}
                </svg>

                <div style={{ position: 'relative', width: GRID_WIDTH, height: GRID_HEIGHT }}>
                    {localDoc.nodes.map((node) => {
                        const isSelected = selectedNodeId === node.id;
                        const isLinkSource = linkFrom?.nodeId === node.id;
                        return (
                            <div
                                key={node.id}
                                onMouseDown={(event) => onNodeMouseDown(event, node)}
                                style={{
                                    position: 'absolute',
                                    left: node.position.x,
                                    top: node.position.y,
                                    width: node.size.width,
                                    height: node.size.height,
                                    borderRadius: node.type === 'circle' ? '9999px' : node.style.radius,
                                    background: node.style.fill,
                                    color: '#fff',
                                    boxShadow: isSelected
                                        ? '0 0 0 3px rgba(59,130,246,0.4), 0 10px 30px rgba(0,0,0,0.25)'
                                        : '0 8px 20px rgba(0,0,0,0.2)',
                                    border: isLinkSource ? '3px dashed #facc15' : '1px solid rgba(255,255,255,0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    padding: 10,
                                    fontWeight: 700,
                                    userSelect: 'none',
                                    cursor: readOnly ? 'default' : 'grab',
                                    clipPath: node.type === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'none'
                                }}
                                title={readOnly ? 'Lectura' : 'Arrastrar'}
                            >
                                <span style={{ transform: node.type === 'diamond' ? 'scale(0.88)' : 'none' }}>{node.content}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <aside className="glass-panel" style={{ padding: 12, border: '1px solid var(--border-dim)' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {!readOnly && (
                        <>
                            <button className="btn-primary" onClick={() => addNode()} style={{ padding: '6px 10px', fontSize: 12 }}>+ Nodo</button>
                            <button
                                className="btn-ghost"
                                onClick={() => {
                                    if (!selectedNode) return;
                                    setLinkFrom({ nodeId: selectedNode.id, port: 'right' });
                                }}
                                disabled={!selectedNode}
                                style={{ padding: '6px 10px', fontSize: 12 }}
                            >
                                Conectar
                            </button>
                            <button
                                className="btn-ghost"
                                onClick={deleteSelectedNode}
                                disabled={!selectedNode}
                                style={{ padding: '6px 10px', fontSize: 12, color: '#ef4444' }}
                            >
                                Eliminar
                            </button>
                        </>
                    )}
                    <button className="btn-ghost" onClick={exportAsPng} style={{ padding: '6px 10px', fontSize: 12 }}>Exportar PNG</button>
                </div>

                {linkFrom && !readOnly && (
                    <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-dim)' }}>
                        Selecciona un nodo destino para crear la conexión ortogonal.
                    </div>
                )}

                {selectedNode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Nodo seleccionado</div>

                        <label style={{ fontSize: 12 }}>Texto</label>
                        <textarea
                            className="input-glass"
                            value={selectedNode.content}
                            onChange={(event) => updateNode(selectedNode.id, { content: event.target.value })}
                            disabled={readOnly}
                            rows={3}
                        />

                        <label style={{ fontSize: 12 }}>Tipo</label>
                        <select
                            className="input-glass"
                            value={selectedNode.type}
                            onChange={(event) => updateNode(selectedNode.id, { type: event.target.value as CanvasNode['type'] })}
                            disabled={readOnly}
                        >
                            <option value="rectangle">Rectángulo</option>
                            <option value="pill">Pill</option>
                            <option value="circle">Círculo</option>
                            <option value="diamond">Rombo</option>
                        </select>

                        <label style={{ fontSize: 12 }}>Color</label>
                        <input
                            type="color"
                            value={selectedNode.style.fill}
                            onChange={(event) => updateNode(selectedNode.id, { style: { fill: event.target.value } })}
                            disabled={readOnly}
                            style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border-dim)' }}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div>
                                <label style={{ fontSize: 12 }}>Ancho</label>
                                <input
                                    className="input-glass"
                                    type="number"
                                    value={selectedNode.size.width}
                                    disabled={readOnly}
                                    min={120}
                                    max={440}
                                    onChange={(event) => updateNode(selectedNode.id, { size: { width: Number(event.target.value) || 200 } })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 12 }}>Alto</label>
                                <input
                                    className="input-glass"
                                    type="number"
                                    value={selectedNode.size.height}
                                    disabled={readOnly}
                                    min={64}
                                    max={320}
                                    onChange={(event) => updateNode(selectedNode.id, { size: { height: Number(event.target.value) || 88 } })}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.5 }}>
                        Selecciona un nodo para editarlo. Doble clic sobre el lienzo para crear uno nuevo.
                    </div>
                )}
            </aside>
        </div>
    );
}
