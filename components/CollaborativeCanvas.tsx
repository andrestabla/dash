"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
    CanvasDocument,
    CanvasEdge,
    CanvasLineStyle,
    CanvasNode,
    CanvasNodeStyle,
    CanvasNodeType,
    CanvasPoint,
    CanvasPort,
    CanvasSize
} from "@/lib/canvas";
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

const NODE_TYPE_OPTIONS: Array<{ value: CanvasNodeType; label: string }> = [
    { value: 'rectangle', label: 'Rectángulo' },
    { value: 'diamond', label: 'Decisión (Rombo)' },
    { value: 'pill', label: 'Inicio/Fin (Píldora)' },
    { value: 'cylinder', label: 'Base de datos' },
    { value: 'document', label: 'Documento' },
    { value: 'parallelogram', label: 'Entrada/Salida' },
    { value: 'sticky', label: 'Sticky note' },
    { value: 'frame', label: 'Frame' },
    { value: 'circle', label: 'Círculo' }
];

const CONNECTION_STYLE_OPTIONS: Array<{ value: CanvasLineStyle; label: string }> = [
    { value: 'orthogonal', label: 'Ortogonal' },
    { value: 'straight', label: 'Recta' },
    { value: 'bezier', label: 'Curva' }
];

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

function pointsToPolylinePath(points: CanvasPoint[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function buildBezierPath(start: CanvasPoint, end: CanvasPoint): string {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const controlX = Math.abs(dx) * 0.45;
    const controlY = Math.abs(dy) * 0.18;

    const c1 = { x: start.x + (dx >= 0 ? controlX : -controlX), y: start.y + (dy >= 0 ? controlY : -controlY) };
    const c2 = { x: end.x - (dx >= 0 ? controlX : -controlX), y: end.y - (dy >= 0 ? controlY : -controlY) };

    return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
}

function getNodeBaseStyle(node: CanvasNode): React.CSSProperties {
    if (node.type === 'sticky') {
        return {
            borderRadius: 8,
            color: '#0f172a',
            boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
            background: '#fde68a'
        };
    }

    if (node.type === 'frame') {
        return {
            borderRadius: 12,
            color: '#0f172a',
            boxShadow: 'none',
            background: 'rgba(255,255,255,0.12)',
            border: '2px dashed rgba(15,23,42,0.35)'
        };
    }

    if (node.type === 'circle') {
        return { borderRadius: '9999px', color: '#fff', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', background: node.style.fill };
    }

    if (node.type === 'pill') {
        return { borderRadius: 9999, color: '#fff', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', background: node.style.fill };
    }

    if (node.type === 'diamond') {
        return {
            borderRadius: 0,
            color: '#fff',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            background: node.style.fill,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
        };
    }

    if (node.type === 'parallelogram') {
        return {
            borderRadius: 8,
            color: '#fff',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            background: node.style.fill,
            clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)'
        };
    }

    if (node.type === 'document') {
        return {
            borderRadius: 8,
            color: '#fff',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            background: node.style.fill,
            clipPath: 'polygon(0 0, 86% 0, 100% 16%, 100% 100%, 0 100%)'
        };
    }

    if (node.type === 'cylinder') {
        return {
            borderRadius: 999,
            color: '#fff',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            background: node.style.fill
        };
    }

    return {
        borderRadius: node.style.radius,
        color: '#fff',
        boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
        background: node.style.fill
    };
}

export default function CollaborativeCanvas({ canvasDocument, onChange, readOnly = false, accentColor = '#3b82f6' }: Props) {
    const normalizedExternalDoc = useMemo(() => normalizeCanvasDocument(canvasDocument), [canvasDocument]);
    const [localDoc, setLocalDoc] = useState<CanvasDocument>(() => cloneDocument(normalizedExternalDoc));
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [linkFrom, setLinkFrom] = useState<{ nodeId: string; port: CanvasPort; lineStyle: CanvasLineStyle } | null>(null);
    const [newNodeType, setNewNodeType] = useState<CanvasNodeType>('rectangle');
    const [newConnectionStyle, setNewConnectionStyle] = useState<CanvasLineStyle>('orthogonal');
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingNodeContent, setEditingNodeContent] = useState('');

    const dragRef = useRef<DragState | null>(null);
    const canvasRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const incoming = cloneDocument(normalizedExternalDoc);
        setLocalDoc(incoming);

        if (selectedNodeId && !incoming.nodes.some((node) => node.id === selectedNodeId)) setSelectedNodeId(null);
        if (selectedEdgeId && !incoming.edges.some((edge) => edge.id === selectedEdgeId)) setSelectedEdgeId(null);
    }, [normalizedExternalDoc, selectedNodeId, selectedEdgeId]);

    const nodesById = useMemo(
        () => new Map(localDoc.nodes.map((node) => [node.id, node] as const)),
        [localDoc.nodes]
    );

    const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) || null : null;
    const selectedEdge = selectedEdgeId ? localDoc.edges.find((edge) => edge.id === selectedEdgeId) || null : null;

    const commit = (doc: CanvasDocument) => {
        const withTimestamp = { ...doc, updatedAt: new Date().toISOString() };
        setLocalDoc(withTimestamp);
        onChange(withTimestamp);
    };

    const applyMagneticSnap = (nodeId: string, position: CanvasPoint): CanvasPoint => {
        const snapped = { ...position };
        for (const node of localDoc.nodes) {
            if (node.id === nodeId) continue;
            if (Math.abs(snapped.x - node.position.x) <= SNAP_THRESHOLD) snapped.x = node.position.x;
            if (Math.abs(snapped.y - node.position.y) <= SNAP_THRESHOLD) snapped.y = node.position.y;
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

    const updateEdge = (edgeId: string, patch: Partial<CanvasEdge>) => {
        const next = cloneDocument(localDoc);
        next.edges = next.edges.map((edge) => edge.id === edgeId ? { ...edge, ...patch } : edge);
        commit(next);
    };

    const addNode = (x = 240, y = 180, type: CanvasNodeType = newNodeType) => {
        if (readOnly) return;

        const isSticky = type === 'sticky';
        const isFrame = type === 'frame';
        const next = cloneDocument(localDoc);
        next.nodes.push({
            id: makeNodeId(),
            type,
            position: { x, y },
            size: {
                width: isFrame ? 420 : (isSticky ? 200 : 220),
                height: isFrame ? 260 : (isSticky ? 150 : 88)
            },
            style: { fill: isSticky ? '#fde68a' : accentColor, radius: 12 },
            content: isFrame ? 'Frame' : 'Nuevo nodo'
        });
        commit(next);
    };

    const deleteSelectedNode = () => {
        if (readOnly || !selectedNodeId) return;
        const next = cloneDocument(localDoc);
        next.nodes = next.nodes.filter((node) => node.id !== selectedNodeId);
        next.edges = next.edges.filter((edge) => edge.source.nodeId !== selectedNodeId && edge.target.nodeId !== selectedNodeId);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setLinkFrom(null);
        commit(next);
    };

    const deleteSelectedEdge = () => {
        if (readOnly || !selectedEdgeId) return;
        const next = cloneDocument(localDoc);
        next.edges = next.edges.filter((edge) => edge.id !== selectedEdgeId);
        setSelectedEdgeId(null);
        commit(next);
    };

    const onCanvasDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        addNode(event.clientX - rect.left - 110, event.clientY - rect.top - 44);
    };

    const finishInlineEdit = () => {
        if (!editingNodeId) return;
        const content = editingNodeContent.trim() || 'Nodo';
        updateNode(editingNodeId, { content });
        setEditingNodeId(null);
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
                            lineStyle: linkFrom.lineStyle,
                            startArrow: false,
                            endArrow: true
                        });
                        commit(next);
                    }
                }
            }
            setLinkFrom(null);
            setSelectedNodeId(node.id);
            setSelectedEdgeId(null);
            return;
        }

        setSelectedNodeId(node.id);
        setSelectedEdgeId(null);

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
            if (readOnly || !dragRef.current || !canvasRef.current || editingNodeId) return;
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
    }, [readOnly, localDoc, editingNodeId]);

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
            const source = nodesMap.get(edge.source.nodeId);
            const target = nodesMap.get(edge.target.nodeId);
            if (!source || !target) return;

            const start = getPortPoint(source, edge.source.port);
            const end = getPortPoint(target, edge.target.port);

            if (edge.lineStyle === 'bezier') {
                const dx = end.x - start.x;
                const c1 = { x: start.x + dx * 0.4, y: start.y };
                const c2 = { x: end.x - dx * 0.4, y: end.y };
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
                ctx.stroke();
                return;
            }

            const points = edge.lineStyle === 'straight'
                ? [start, end]
                : buildOrthogonalPoints(edge, nodesMap, doc.nodes);

            if (points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
            ctx.stroke();
        });

        doc.nodes.forEach((node) => {
            ctx.fillStyle = node.type === 'sticky' ? '#fde68a' : (node.style.fill || '#3b82f6');
            ctx.fillRect(node.position.x, node.position.y, node.size.width, node.size.height);
            ctx.strokeStyle = '#0f172a';
            ctx.strokeRect(node.position.x, node.position.y, node.size.width, node.size.height);

            ctx.fillStyle = node.type === 'sticky' || node.type === 'frame' ? '#0f172a' : '#ffffff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.content.slice(0, 34), node.position.x + 14, node.position.y + node.size.height / 2);
        });

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `canvas-${Date.now()}.png`;
        link.click();
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, height: '100%' }}>
            <div
                ref={canvasRef}
                onClick={() => {
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
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
                    <defs>
                        <marker id="arrow-end" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
                            <path d="M0,0 L8,4 L0,8 Z" fill="#334155" />
                        </marker>
                        <marker id="arrow-start" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto" markerUnits="strokeWidth">
                            <path d="M8,0 L0,4 L8,8 Z" fill="#334155" />
                        </marker>
                    </defs>

                    {localDoc.edges.map((edge) => {
                        const sourceNode = nodesById.get(edge.source.nodeId);
                        const targetNode = nodesById.get(edge.target.nodeId);
                        if (!sourceNode || !targetNode) return null;

                        const start = getPortPoint(sourceNode, edge.source.port);
                        const end = getPortPoint(targetNode, edge.target.port);

                        let pathData = '';
                        let centerPoint: CanvasPoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

                        if (edge.lineStyle === 'bezier') {
                            pathData = buildBezierPath(start, end);
                        } else if (edge.lineStyle === 'straight') {
                            pathData = pointsToPolylinePath([start, end]);
                        } else {
                            const points = buildOrthogonalPoints(edge, nodesById, localDoc.nodes);
                            pathData = pointsToPolylinePath(points);
                            if (points.length > 0) centerPoint = points[Math.floor(points.length / 2)];
                        }

                        return (
                            <g key={edge.id}>
                                <path
                                    d={pathData}
                                    stroke={selectedEdgeId === edge.id ? '#2563eb' : '#64748b'}
                                    strokeWidth={selectedEdgeId === edge.id ? 3 : 2}
                                    fill="none"
                                    markerStart={edge.startArrow ? 'url(#arrow-start)' : undefined}
                                    markerEnd={edge.endArrow === false ? undefined : 'url(#arrow-end)'}
                                    style={{ pointerEvents: 'stroke' }}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedEdgeId(edge.id);
                                        setSelectedNodeId(null);
                                    }}
                                />

                                {edge.text && (
                                    <text
                                        x={centerPoint.x + 6}
                                        y={centerPoint.y - 6}
                                        fontSize="12"
                                        fill="#334155"
                                        pointerEvents="none"
                                    >
                                        {edge.text}
                                    </text>
                                )}

                                {edge.comment && (
                                    <text
                                        x={centerPoint.x + 6}
                                        y={centerPoint.y + 12}
                                        fontSize="11"
                                        fill="#64748b"
                                        pointerEvents="none"
                                    >
                                        📝
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                <div style={{ position: 'relative', width: GRID_WIDTH, height: GRID_HEIGHT }}>
                    {localDoc.nodes.map((node) => {
                        const isSelected = selectedNodeId === node.id;
                        const isLinkSource = linkFrom?.nodeId === node.id;
                        const isInlineEditing = editingNodeId === node.id;

                        const baseStyle = getNodeBaseStyle(node);

                        return (
                            <div
                                key={node.id}
                                onMouseDown={(event) => onNodeMouseDown(event, node)}
                                onDoubleClick={(event) => {
                                    if (readOnly) return;
                                    event.stopPropagation();
                                    setSelectedNodeId(node.id);
                                    setSelectedEdgeId(null);
                                    setEditingNodeId(node.id);
                                    setEditingNodeContent(node.content);
                                }}
                                style={{
                                    position: 'absolute',
                                    left: node.position.x,
                                    top: node.position.y,
                                    width: node.size.width,
                                    height: node.size.height,
                                    border: isLinkSource
                                        ? '3px dashed #facc15'
                                        : isSelected
                                            ? '2px solid rgba(37,99,235,0.9)'
                                            : '1px solid rgba(255,255,255,0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    padding: 10,
                                    fontWeight: 700,
                                    userSelect: 'none',
                                    cursor: readOnly ? 'default' : (isInlineEditing ? 'text' : 'grab'),
                                    ...baseStyle
                                }}
                                title={readOnly ? 'Lectura' : 'Doble clic para editar'}
                            >
                                {isInlineEditing ? (
                                    <textarea
                                        autoFocus
                                        value={editingNodeContent}
                                        onChange={(event) => setEditingNodeContent(event.target.value)}
                                        onBlur={finishInlineEdit}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' && !event.shiftKey) {
                                                event.preventDefault();
                                                finishInlineEdit();
                                            }
                                            if (event.key === 'Escape') {
                                                setEditingNodeId(null);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            background: 'rgba(255,255,255,0.16)',
                                            border: '1px solid rgba(255,255,255,0.45)',
                                            borderRadius: 8,
                                            color: node.type === 'sticky' || node.type === 'frame' ? '#0f172a' : '#fff',
                                            fontWeight: 700,
                                            textAlign: 'center',
                                            padding: 8,
                                            resize: 'none'
                                        }}
                                    />
                                ) : (
                                    <span style={{ transform: node.type === 'diamond' ? 'scale(0.88)' : 'none' }}>{node.content}</span>
                                )}

                                {node.comment && !isInlineEditing && (
                                    <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 12 }}>📝</span>
                                )}
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
                                    setLinkFrom({ nodeId: selectedNode.id, port: 'right', lineStyle: newConnectionStyle });
                                }}
                                disabled={!selectedNode}
                                style={{ padding: '6px 10px', fontSize: 12 }}
                            >
                                Conectar
                            </button>
                            <button
                                className="btn-ghost"
                                onClick={selectedEdge ? deleteSelectedEdge : deleteSelectedNode}
                                disabled={!selectedNode && !selectedEdge}
                                style={{ padding: '6px 10px', fontSize: 12, color: '#ef4444' }}
                            >
                                Eliminar
                            </button>
                        </>
                    )}
                    <button className="btn-ghost" onClick={exportAsPng} style={{ padding: '6px 10px', fontSize: 12 }}>Exportar PNG</button>
                </div>

                <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                    <div>
                        <label style={{ fontSize: 12 }}>Nuevo elemento</label>
                        <select
                            className="input-glass"
                            value={newNodeType}
                            onChange={(event) => setNewNodeType(event.target.value as CanvasNodeType)}
                            disabled={readOnly}
                        >
                            {NODE_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 12 }}>Conexión por defecto</label>
                        <select
                            className="input-glass"
                            value={newConnectionStyle}
                            onChange={(event) => setNewConnectionStyle(event.target.value as CanvasLineStyle)}
                            disabled={readOnly}
                        >
                            {CONNECTION_STYLE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {linkFrom && !readOnly && (
                    <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-dim)' }}>
                        Selecciona un nodo destino para crear la conexión ({newConnectionStyle}).
                    </div>
                )}

                {selectedNode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Nodo seleccionado</div>

                        <label style={{ fontSize: 12 }}>Texto</label>
                        <textarea
                            className="input-glass"
                            value={selectedNode.content}
                            onChange={(event) => updateNode(selectedNode.id, { content: event.target.value })}
                            disabled={readOnly}
                            rows={2}
                        />

                        <label style={{ fontSize: 12 }}>Comentario</label>
                        <textarea
                            className="input-glass"
                            value={selectedNode.comment || ''}
                            onChange={(event) => updateNode(selectedNode.id, { comment: event.target.value })}
                            disabled={readOnly}
                            rows={2}
                            placeholder="Comentario del elemento"
                        />

                        <label style={{ fontSize: 12 }}>Tipo</label>
                        <select
                            className="input-glass"
                            value={selectedNode.type}
                            onChange={(event) => updateNode(selectedNode.id, { type: event.target.value as CanvasNode['type'] })}
                            disabled={readOnly}
                        >
                            {NODE_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        <label style={{ fontSize: 12 }}>Color</label>
                        <input
                            type="color"
                            value={selectedNode.style.fill}
                            onChange={(event) => updateNode(selectedNode.id, { style: { fill: event.target.value } })}
                            disabled={readOnly}
                            style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border-dim)' }}
                        />
                    </div>
                )}

                {selectedEdge && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: selectedNode ? 14 : 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Conexión seleccionada</div>

                        <label style={{ fontSize: 12 }}>Tipo de línea</label>
                        <select
                            className="input-glass"
                            value={selectedEdge.lineStyle}
                            onChange={(event) => updateEdge(selectedEdge.id, { lineStyle: event.target.value as CanvasLineStyle })}
                            disabled={readOnly}
                        >
                            {CONNECTION_STYLE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        <label style={{ fontSize: 12 }}>Texto de conexión</label>
                        <input
                            className="input-glass"
                            value={selectedEdge.text || ''}
                            onChange={(event) => updateEdge(selectedEdge.id, { text: event.target.value })}
                            disabled={readOnly}
                            placeholder="Ej: Sí / No"
                        />

                        <label style={{ fontSize: 12 }}>Comentario</label>
                        <textarea
                            className="input-glass"
                            value={selectedEdge.comment || ''}
                            onChange={(event) => updateEdge(selectedEdge.id, { comment: event.target.value })}
                            disabled={readOnly}
                            rows={2}
                            placeholder="Comentario de la conexión"
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <input
                                    type="checkbox"
                                    checked={!!selectedEdge.startArrow}
                                    onChange={(event) => updateEdge(selectedEdge.id, { startArrow: event.target.checked })}
                                    disabled={readOnly}
                                />
                                Flecha inicio
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <input
                                    type="checkbox"
                                    checked={selectedEdge.endArrow !== false}
                                    onChange={(event) => updateEdge(selectedEdge.id, { endArrow: event.target.checked })}
                                    disabled={readOnly}
                                />
                                Flecha fin
                            </label>
                        </div>
                    </div>
                )}

                {!selectedNode && !selectedEdge && (
                    <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.5 }}>
                        Doble clic sobre un nodo para editarlo en línea. Selecciona nodos o conexiones para editar contenido, estilo y comentarios.
                    </div>
                )}
            </aside>
        </div>
    );
}
