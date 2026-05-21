"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    primaryId: string;
    startWorldX: number;
    startWorldY: number;
    origins: Record<string, CanvasPoint>;
};

type PanDragState = {
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    moved: boolean;
};

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

type ResizeState = {
    nodeId: string;
    corner: ResizeCorner;
    startW: number;
    startH: number;
    startX: number;
    startY: number;
    startWorldX: number;
    startWorldY: number;
};

type MarqueeState = {
    startX: number;
    startY: number;
    moved: boolean;
};

type MarqueeRect = { x: number; y: number; width: number; height: number };
type AlignmentGuide = { axis: 'x' | 'y'; pos: number };

type CanvasNodePatch = Partial<Omit<CanvasNode, 'position' | 'size' | 'style'>> & {
    position?: Partial<CanvasPoint>;
    size?: Partial<CanvasSize>;
    style?: Partial<CanvasNodeStyle>;
};

const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 4000;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const GUIDE_THRESHOLD = 6;
const MIN_NODE_SIZE = 40;
const HISTORY_LIMIT = 50;
const HISTORY_COALESCE_MS = 500;
const DUPLICATE_OFFSET = 28;

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

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

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

function rectsIntersect(a: MarqueeRect, b: MarqueeRect): boolean {
    return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
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

function isTypingTarget(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

const RESIZE_CORNERS: Array<{ corner: ResizeCorner; cursor: string }> = [
    { corner: 'nw', cursor: 'nwse-resize' },
    { corner: 'ne', cursor: 'nesw-resize' },
    { corner: 'sw', cursor: 'nesw-resize' },
    { corner: 'se', cursor: 'nwse-resize' }
];

export default function CollaborativeCanvas({ canvasDocument, onChange, readOnly = false, accentColor = '#3b82f6' }: Props) {
    const normalizedExternalDoc = useMemo(() => normalizeCanvasDocument(canvasDocument), [canvasDocument]);
    const [localDoc, setLocalDoc] = useState<CanvasDocument>(() => cloneDocument(normalizedExternalDoc));
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [linkFrom, setLinkFrom] = useState<{ nodeId: string; port: CanvasPort; lineStyle: CanvasLineStyle } | null>(null);
    const [newNodeType, setNewNodeType] = useState<CanvasNodeType>('rectangle');
    const [newConnectionStyle, setNewConnectionStyle] = useState<CanvasLineStyle>('orthogonal');
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingNodeContent, setEditingNodeContent] = useState('');

    // Viewport state (Phase 1).
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState<CanvasPoint>({ x: 0, y: 0 });
    const [isSpaceDown, setIsSpaceDown] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [guides, setGuides] = useState<AlignmentGuide[]>([]);

    // Editing state (Phase 2).
    const [past, setPast] = useState<CanvasDocument[]>([]);
    const [future, setFuture] = useState<CanvasDocument[]>([]);
    const [marquee, setMarquee] = useState<MarqueeRect | null>(null);

    const dragRef = useRef<DragState | null>(null);
    const panDragRef = useRef<PanDragState | null>(null);
    const resizeRef = useRef<ResizeState | null>(null);
    const marqueeRef = useRef<MarqueeState | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const zoomRef = useRef(1);
    const panRef = useRef<CanvasPoint>({ x: 0, y: 0 });
    const isSpaceDownRef = useRef(false);
    const suppressClickRef = useRef(false);

    const localDocRef = useRef(localDoc);
    const selectedNodeIdsRef = useRef<string[]>([]);
    const selectedEdgeIdRef = useRef<string | null>(null);
    const pastRef = useRef<CanvasDocument[]>([]);
    const futureRef = useRef<CanvasDocument[]>([]);
    const editingNodeIdRef = useRef<string | null>(null);
    const clipboardRef = useRef<CanvasNode[]>([]);
    const lastHistoryAtRef = useRef(0);

    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { panRef.current = pan; }, [pan]);
    useEffect(() => { localDocRef.current = localDoc; }, [localDoc]);
    useEffect(() => { selectedNodeIdsRef.current = selectedNodeIds; }, [selectedNodeIds]);
    useEffect(() => { selectedEdgeIdRef.current = selectedEdgeId; }, [selectedEdgeId]);
    useEffect(() => { pastRef.current = past; }, [past]);
    useEffect(() => { futureRef.current = future; }, [future]);
    useEffect(() => { editingNodeIdRef.current = editingNodeId; }, [editingNodeId]);

    useEffect(() => {
        const incoming = cloneDocument(normalizedExternalDoc);
        setLocalDoc(incoming);
        localDocRef.current = incoming;

        setSelectedNodeIds((ids) => ids.filter((id) => incoming.nodes.some((node) => node.id === id)));
        if (selectedEdgeId && !incoming.edges.some((edge) => edge.id === selectedEdgeId)) setSelectedEdgeId(null);
    }, [normalizedExternalDoc, selectedEdgeId]);

    const nodesById = useMemo(
        () => new Map(localDoc.nodes.map((node) => [node.id, node] as const)),
        [localDoc.nodes]
    );

    const selectedNode = selectedNodeIds.length === 1 ? nodesById.get(selectedNodeIds[0]) || null : null;
    const selectedEdge = selectedEdgeId ? localDoc.edges.find((edge) => edge.id === selectedEdgeId) || null : null;

    const applyDoc = useCallback((doc: CanvasDocument) => {
        localDocRef.current = doc;
        setLocalDoc(doc);
        setSelectedNodeIds((ids) => ids.filter((id) => doc.nodes.some((node) => node.id === id)));
        onChange(doc);
    }, [onChange]);

    const commit = useCallback((doc: CanvasDocument) => {
        const withTimestamp = { ...doc, updatedAt: new Date().toISOString() };
        localDocRef.current = withTimestamp;
        setLocalDoc(withTimestamp);
        onChange(withTimestamp);
    }, [onChange]);

    const pushHistory = useCallback(() => {
        const snapshot = cloneDocument(localDocRef.current);
        setPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), snapshot]);
        setFuture([]);
        lastHistoryAtRef.current = Date.now();
    }, []);

    const commitWithHistory = useCallback((doc: CanvasDocument, coalesce = false) => {
        if (!coalesce || Date.now() - lastHistoryAtRef.current > HISTORY_COALESCE_MS) {
            pushHistory();
        }
        commit(doc);
    }, [commit, pushHistory]);

    const undo = useCallback(() => {
        if (readOnly) return;
        const prev = pastRef.current;
        if (prev.length === 0) return;
        const restored = prev[prev.length - 1];
        setPast(prev.slice(0, -1));
        setFuture([cloneDocument(localDocRef.current), ...futureRef.current].slice(0, HISTORY_LIMIT));
        applyDoc(restored);
    }, [applyDoc, readOnly]);

    const redo = useCallback(() => {
        if (readOnly) return;
        const next = futureRef.current;
        if (next.length === 0) return;
        const restored = next[0];
        setFuture(next.slice(1));
        setPast([...pastRef.current.slice(-(HISTORY_LIMIT - 1)), cloneDocument(localDocRef.current)]);
        applyDoc(restored);
    }, [applyDoc, readOnly]);

    const screenToWorld = useCallback((clientX: number, clientY: number): CanvasPoint => {
        const rect = viewportRef.current?.getBoundingClientRect();
        const left = rect?.left ?? 0;
        const top = rect?.top ?? 0;
        return {
            x: (clientX - left - panRef.current.x) / zoomRef.current,
            y: (clientY - top - panRef.current.y) / zoomRef.current
        };
    }, []);

    const setViewport = useCallback((nextZoom: number, nextPan: CanvasPoint) => {
        zoomRef.current = nextZoom;
        panRef.current = nextPan;
        setZoom(nextZoom);
        setPan(nextPan);
    }, []);

    const zoomToward = useCallback((nextZoomRaw: number, anchorClientX: number, anchorClientY: number) => {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;
        const nextZoom = clamp(nextZoomRaw, MIN_ZOOM, MAX_ZOOM);
        const ax = anchorClientX - rect.left;
        const ay = anchorClientY - rect.top;
        const wx = (ax - panRef.current.x) / zoomRef.current;
        const wy = (ay - panRef.current.y) / zoomRef.current;
        setViewport(nextZoom, { x: ax - wx * nextZoom, y: ay - wy * nextZoom });
    }, [setViewport]);

    const zoomByStep = useCallback((factor: number) => {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;
        zoomToward(zoomRef.current * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }, [zoomToward]);

    const zoomToFit = useCallback(() => {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;
        if (localDoc.nodes.length === 0) {
            setViewport(1, { x: 40, y: 40 });
            return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of localDoc.nodes) {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + node.size.width);
            maxY = Math.max(maxY, node.position.y + node.size.height);
        }
        const bw = Math.max(1, maxX - minX);
        const bh = Math.max(1, maxY - minY);
        const pad = 80;
        const z = clamp(Math.min((rect.width - pad * 2) / bw, (rect.height - pad * 2) / bh), MIN_ZOOM, MAX_ZOOM);
        setViewport(z, {
            x: (rect.width - bw * z) / 2 - minX * z,
            y: (rect.height - bh * z) / 2 - minY * z
        });
    }, [localDoc.nodes, setViewport]);

    // Cmd/Ctrl + wheel zooms; plain wheel/trackpad pans.
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            if (event.ctrlKey || event.metaKey) {
                zoomToward(zoomRef.current * Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
            } else {
                const next = { x: panRef.current.x - event.deltaX, y: panRef.current.y - event.deltaY };
                panRef.current = next;
                setPan(next);
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [zoomToward]);

    useEffect(() => {
        const onKeyUp = (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                isSpaceDownRef.current = false;
                setIsSpaceDown(false);
            }
        };
        window.addEventListener('keyup', onKeyUp);
        return () => window.removeEventListener('keyup', onKeyUp);
    }, []);

    const applyMagneticSnap = (nodeId: string, size: CanvasSize, position: CanvasPoint): { position: CanvasPoint; guides: AlignmentGuide[] } => {
        const draggedX = [position.x, position.x + size.width / 2, position.x + size.width];
        const draggedY = [position.y, position.y + size.height / 2, position.y + size.height];

        let bestX: { diff: number; pos: number } | null = null;
        let bestY: { diff: number; pos: number } | null = null;

        for (const node of localDocRef.current.nodes) {
            if (node.id === nodeId) continue;
            const otherX = [node.position.x, node.position.x + node.size.width / 2, node.position.x + node.size.width];
            const otherY = [node.position.y, node.position.y + node.size.height / 2, node.position.y + node.size.height];

            for (const d of draggedX) {
                for (const o of otherX) {
                    const diff = o - d;
                    if (Math.abs(diff) <= GUIDE_THRESHOLD && (bestX === null || Math.abs(diff) < Math.abs(bestX.diff))) {
                        bestX = { diff, pos: o };
                    }
                }
            }
            for (const d of draggedY) {
                for (const o of otherY) {
                    const diff = o - d;
                    if (Math.abs(diff) <= GUIDE_THRESHOLD && (bestY === null || Math.abs(diff) < Math.abs(bestY.diff))) {
                        bestY = { diff, pos: o };
                    }
                }
            }
        }

        const snapped = { ...position };
        const nextGuides: AlignmentGuide[] = [];
        if (bestX) {
            snapped.x = position.x + bestX.diff;
            nextGuides.push({ axis: 'x', pos: bestX.pos });
        }
        if (bestY) {
            snapped.y = position.y + bestY.diff;
            nextGuides.push({ axis: 'y', pos: bestY.pos });
        }
        return { position: snapped, guides: nextGuides };
    };

    const updateNode = (nodeId: string, patch: CanvasNodePatch, coalesce = false) => {
        const next = cloneDocument(localDocRef.current);
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
        commitWithHistory(next, coalesce);
    };

    const updateEdge = (edgeId: string, patch: Partial<CanvasEdge>, coalesce = false) => {
        const next = cloneDocument(localDocRef.current);
        next.edges = next.edges.map((edge) => edge.id === edgeId ? { ...edge, ...patch } : edge);
        commitWithHistory(next, coalesce);
    };

    const addNode = (x = 240, y = 180, type: CanvasNodeType = newNodeType) => {
        if (readOnly) return;

        const isSticky = type === 'sticky';
        const isFrame = type === 'frame';
        const next = cloneDocument(localDocRef.current);
        const id = makeNodeId();
        next.nodes.push({
            id,
            type,
            position: { x: Math.max(0, x), y: Math.max(0, y) },
            size: {
                width: isFrame ? 420 : (isSticky ? 200 : 220),
                height: isFrame ? 260 : (isSticky ? 150 : 88)
            },
            style: { fill: isSticky ? '#fde68a' : accentColor, radius: 12 },
            content: isFrame ? 'Frame' : 'Nuevo nodo'
        });
        commitWithHistory(next);
        setSelectedNodeIds([id]);
        setSelectedEdgeId(null);
    };

    const addNodeCentered = () => {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) {
            addNode();
            return;
        }
        const center = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
        addNode(center.x - 110, center.y - 44);
    };

    const deleteSelection = () => {
        if (readOnly) return;
        const ids = selectedNodeIdsRef.current;
        const edgeId = selectedEdgeIdRef.current;
        if (ids.length === 0 && !edgeId) return;
        const idSet = new Set(ids);
        const next = cloneDocument(localDocRef.current);
        next.nodes = next.nodes.filter((node) => !idSet.has(node.id));
        next.edges = next.edges.filter((edge) =>
            edge.id !== edgeId && !idSet.has(edge.source.nodeId) && !idSet.has(edge.target.nodeId)
        );
        setSelectedNodeIds([]);
        setSelectedEdgeId(null);
        setLinkFrom(null);
        commitWithHistory(next);
    };

    const duplicateSelection = () => {
        if (readOnly) return;
        const ids = selectedNodeIdsRef.current;
        if (ids.length === 0) return;
        const idSet = new Set(ids);
        const next = cloneDocument(localDocRef.current);
        const created: string[] = [];
        for (const node of localDocRef.current.nodes) {
            if (!idSet.has(node.id)) continue;
            const id = makeNodeId();
            created.push(id);
            next.nodes.push({
                ...node,
                id,
                position: { x: node.position.x + DUPLICATE_OFFSET, y: node.position.y + DUPLICATE_OFFSET },
                size: { ...node.size },
                style: { ...node.style }
            });
        }
        if (created.length === 0) return;
        commitWithHistory(next);
        setSelectedNodeIds(created);
        setSelectedEdgeId(null);
    };

    const copySelection = () => {
        const ids = new Set(selectedNodeIdsRef.current);
        clipboardRef.current = localDocRef.current.nodes
            .filter((node) => ids.has(node.id))
            .map((node) => ({ ...node, position: { ...node.position }, size: { ...node.size }, style: { ...node.style } }));
    };

    const pasteClipboard = () => {
        if (readOnly || clipboardRef.current.length === 0) return;
        const next = cloneDocument(localDocRef.current);
        const created: string[] = [];
        for (const node of clipboardRef.current) {
            const id = makeNodeId();
            created.push(id);
            next.nodes.push({
                ...node,
                id,
                position: { x: node.position.x + DUPLICATE_OFFSET, y: node.position.y + DUPLICATE_OFFSET },
                size: { ...node.size },
                style: { ...node.style }
            });
        }
        commitWithHistory(next);
        setSelectedNodeIds(created);
        setSelectedEdgeId(null);
    };

    const nudgeSelection = (dx: number, dy: number) => {
        if (readOnly) return;
        const ids = new Set(selectedNodeIdsRef.current);
        if (ids.size === 0) return;
        const next = cloneDocument(localDocRef.current);
        next.nodes = next.nodes.map((node) => ids.has(node.id)
            ? { ...node, position: { x: Math.max(0, node.position.x + dx), y: Math.max(0, node.position.y + dy) } }
            : node
        );
        commitWithHistory(next, true);
    };

    const finishInlineEdit = () => {
        if (!editingNodeId) return;
        const content = editingNodeContent.trim() || 'Nodo';
        updateNode(editingNodeId, { content });
        setEditingNodeId(null);
    };

    const startPan = (clientX: number, clientY: number) => {
        panDragRef.current = {
            startX: clientX,
            startY: clientY,
            startPanX: panRef.current.x,
            startPanY: panRef.current.y,
            moved: false
        };
        setIsPanning(true);
    };

    const onViewportMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (isSpaceDownRef.current || event.button === 1) {
            event.preventDefault();
            startPan(event.clientX, event.clientY);
            return;
        }
        if (event.button !== 0) return;
        // Empty-canvas drag starts a marquee selection.
        const world = screenToWorld(event.clientX, event.clientY);
        marqueeRef.current = { startX: world.x, startY: world.y, moved: false };
        setMarquee({ x: world.x, y: world.y, width: 0, height: 0 });
    };

    const onViewportDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly || isSpaceDownRef.current) return;
        const world = screenToWorld(event.clientX, event.clientY);
        addNode(world.x - 110, world.y - 44);
    };

    const onNodeMouseDown = (event: React.MouseEvent<HTMLDivElement>, node: CanvasNode) => {
        event.stopPropagation();

        if (isSpaceDownRef.current || event.button === 1) {
            event.preventDefault();
            startPan(event.clientX, event.clientY);
            return;
        }
        if (event.button !== 0) return;

        if (linkFrom && !readOnly) {
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
                        const next = cloneDocument(localDocRef.current);
                        next.edges.push({
                            id: makeEdgeId(),
                            type: 'connector',
                            source: { nodeId: linkFrom.nodeId, port: linkFrom.port },
                            target: { nodeId: node.id, port: targetPort },
                            lineStyle: linkFrom.lineStyle,
                            startArrow: false,
                            endArrow: true
                        });
                        commitWithHistory(next);
                    }
                }
            }
            setLinkFrom(null);
            setSelectedNodeIds([node.id]);
            setSelectedEdgeId(null);
            return;
        }

        const additive = event.shiftKey;
        let nextSelection: string[];
        if (additive) {
            nextSelection = selectedNodeIdsRef.current.includes(node.id)
                ? selectedNodeIdsRef.current.filter((id) => id !== node.id)
                : [...selectedNodeIdsRef.current, node.id];
            setSelectedNodeIds(nextSelection);
            setSelectedEdgeId(null);
            return;
        }

        nextSelection = selectedNodeIdsRef.current.includes(node.id)
            ? selectedNodeIdsRef.current
            : [node.id];
        setSelectedNodeIds(nextSelection);
        setSelectedEdgeId(null);

        if (readOnly) return;

        const world = screenToWorld(event.clientX, event.clientY);
        const origins: Record<string, CanvasPoint> = {};
        for (const id of nextSelection) {
            const target = nodesById.get(id);
            if (target) origins[id] = { ...target.position };
        }
        pushHistory();
        dragRef.current = { primaryId: node.id, startWorldX: world.x, startWorldY: world.y, origins };
    };

    const onResizeHandleMouseDown = (event: React.MouseEvent<HTMLDivElement>, node: CanvasNode, corner: ResizeCorner) => {
        if (readOnly) return;
        event.stopPropagation();
        event.preventDefault();
        const world = screenToWorld(event.clientX, event.clientY);
        pushHistory();
        resizeRef.current = {
            nodeId: node.id,
            corner,
            startW: node.size.width,
            startH: node.size.height,
            startX: node.position.x,
            startY: node.position.y,
            startWorldX: world.x,
            startWorldY: world.y
        };
    };

    useEffect(() => {
        const onMouseMove = (event: MouseEvent) => {
            if (panDragRef.current) {
                const state = panDragRef.current;
                const dx = event.clientX - state.startX;
                const dy = event.clientY - state.startY;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.moved = true;
                const next = { x: state.startPanX + dx, y: state.startPanY + dy };
                panRef.current = next;
                setPan(next);
                return;
            }

            if (readOnly) return;

            if (resizeRef.current) {
                const state = resizeRef.current;
                const world = screenToWorld(event.clientX, event.clientY);
                const dx = world.x - state.startWorldX;
                const dy = world.y - state.startWorldY;
                let width = state.startW;
                let height = state.startH;
                let x = state.startX;
                let y = state.startY;
                if (state.corner === 'se') {
                    width = state.startW + dx;
                    height = state.startH + dy;
                } else if (state.corner === 'sw') {
                    width = state.startW - dx;
                    height = state.startH + dy;
                    x = state.startX + dx;
                } else if (state.corner === 'ne') {
                    width = state.startW + dx;
                    height = state.startH - dy;
                    y = state.startY + dy;
                } else {
                    width = state.startW - dx;
                    height = state.startH - dy;
                    x = state.startX + dx;
                    y = state.startY + dy;
                }
                if (width < MIN_NODE_SIZE) {
                    if (state.corner === 'nw' || state.corner === 'sw') x = state.startX + (state.startW - MIN_NODE_SIZE);
                    width = MIN_NODE_SIZE;
                }
                if (height < MIN_NODE_SIZE) {
                    if (state.corner === 'nw' || state.corner === 'ne') y = state.startY + (state.startH - MIN_NODE_SIZE);
                    height = MIN_NODE_SIZE;
                }
                const next = cloneDocument(localDocRef.current);
                next.nodes = next.nodes.map((node) => node.id === state.nodeId
                    ? { ...node, position: { x: Math.max(0, x), y: Math.max(0, y) }, size: { width, height } }
                    : node
                );
                commit(next);
                return;
            }

            if (dragRef.current && !editingNodeId) {
                const state = dragRef.current;
                const world = screenToWorld(event.clientX, event.clientY);
                const rawDelta = { x: world.x - state.startWorldX, y: world.y - state.startWorldY };
                const primaryOrigin = state.origins[state.primaryId];
                const primaryNode = nodesById.get(state.primaryId);
                let finalDelta = rawDelta;
                let nextGuides: AlignmentGuide[] = [];
                if (primaryOrigin && primaryNode) {
                    const rawPrimary = { x: primaryOrigin.x + rawDelta.x, y: primaryOrigin.y + rawDelta.y };
                    const snap = applyMagneticSnap(state.primaryId, primaryNode.size, rawPrimary);
                    finalDelta = {
                        x: rawDelta.x + (snap.position.x - rawPrimary.x),
                        y: rawDelta.y + (snap.position.y - rawPrimary.y)
                    };
                    nextGuides = snap.guides;
                }
                setGuides(nextGuides);
                const next = cloneDocument(localDocRef.current);
                next.nodes = next.nodes.map((node) => {
                    const origin = state.origins[node.id];
                    if (!origin) return node;
                    return {
                        ...node,
                        position: {
                            x: Math.max(0, origin.x + finalDelta.x),
                            y: Math.max(0, origin.y + finalDelta.y)
                        }
                    };
                });
                commit(next);
                return;
            }

            if (marqueeRef.current) {
                const state = marqueeRef.current;
                const world = screenToWorld(event.clientX, event.clientY);
                if (Math.abs(world.x - state.startX) > 3 || Math.abs(world.y - state.startY) > 3) state.moved = true;
                setMarquee({
                    x: Math.min(state.startX, world.x),
                    y: Math.min(state.startY, world.y),
                    width: Math.abs(world.x - state.startX),
                    height: Math.abs(world.y - state.startY)
                });
            }
        };

        const onMouseUp = (event: MouseEvent) => {
            if (panDragRef.current) {
                if (panDragRef.current.moved) suppressClickRef.current = true;
                panDragRef.current = null;
                setIsPanning(false);
            }
            if (resizeRef.current) {
                resizeRef.current = null;
            }
            if (dragRef.current) {
                dragRef.current = null;
                setGuides([]);
            }
            if (marqueeRef.current) {
                const state = marqueeRef.current;
                marqueeRef.current = null;
                if (state.moved) {
                    const world = screenToWorld(event.clientX, event.clientY);
                    const rect: MarqueeRect = {
                        x: Math.min(state.startX, world.x),
                        y: Math.min(state.startY, world.y),
                        width: Math.abs(world.x - state.startX),
                        height: Math.abs(world.y - state.startY)
                    };
                    const hits = localDocRef.current.nodes
                        .filter((node) => rectsIntersect(rect, { x: node.position.x, y: node.position.y, width: node.size.width, height: node.size.height }))
                        .map((node) => node.id);
                    setSelectedNodeIds(hits);
                    setSelectedEdgeId(null);
                } else {
                    setSelectedNodeIds([]);
                    setSelectedEdgeId(null);
                    if (!readOnly) setLinkFrom(null);
                }
                setMarquee(null);
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [readOnly, editingNodeId, nodesById, screenToWorld, commit]);

    // Keyboard shortcuts.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code === 'Space' && !isTypingTarget()) {
                event.preventDefault();
                isSpaceDownRef.current = true;
                setIsSpaceDown(true);
                return;
            }
            if (isTypingTarget()) return;

            const mod = event.metaKey || event.ctrlKey;

            if (mod && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (event.shiftKey) redo();
                else undo();
                return;
            }
            if (mod && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                redo();
                return;
            }
            if (mod && event.key.toLowerCase() === 'a') {
                event.preventDefault();
                setSelectedNodeIds(localDocRef.current.nodes.map((node) => node.id));
                setSelectedEdgeId(null);
                return;
            }
            if (mod && event.key.toLowerCase() === 'd') {
                event.preventDefault();
                duplicateSelection();
                return;
            }
            if (mod && event.key.toLowerCase() === 'c') {
                copySelection();
                return;
            }
            if (mod && event.key.toLowerCase() === 'v') {
                event.preventDefault();
                pasteClipboard();
                return;
            }
            if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault();
                deleteSelection();
                return;
            }
            if (event.key === 'Escape') {
                setSelectedNodeIds([]);
                setSelectedEdgeId(null);
                setLinkFrom(null);
                setEditingNodeId(null);
                return;
            }
            if (event.key.startsWith('Arrow') && selectedNodeIdsRef.current.length > 0) {
                event.preventDefault();
                const step = event.shiftKey ? 10 : 1;
                if (event.key === 'ArrowUp') nudgeSelection(0, -step);
                else if (event.key === 'ArrowDown') nudgeSelection(0, step);
                else if (event.key === 'ArrowLeft') nudgeSelection(-step, 0);
                else if (event.key === 'ArrowRight') nudgeSelection(step, 0);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [undo, redo]);

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

    const viewportCursor = isPanning ? 'grabbing' : (isSpaceDown ? 'grab' : 'default');
    const selectedSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
    const resizeTarget = (!readOnly && !editingNodeId && selectedNodeIds.length === 1) ? selectedNode : null;

    const zoomControlButton: React.CSSProperties = {
        width: 30,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        color: 'var(--text-main, #0f172a)',
        cursor: 'pointer',
        fontSize: 16,
        borderRadius: 8
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, height: '100%' }}>
            <div
                ref={viewportRef}
                onMouseDown={onViewportMouseDown}
                onDoubleClick={onViewportDoubleClick}
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 16,
                    border: '1px solid var(--border-dim)',
                    minHeight: 520,
                    height: '100%',
                    backgroundColor: 'var(--bg-card)',
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.35) 1px, transparent 0)',
                    backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`,
                    cursor: viewportCursor
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: WORLD_WIDTH,
                        height: WORLD_HEIGHT,
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0'
                    }}
                >
                    <svg width={WORLD_WIDTH} height={WORLD_HEIGHT} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
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
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setSelectedEdgeId(edge.id);
                                            setSelectedNodeIds([]);
                                        }}
                                    />

                                    {edge.text && (
                                        <text x={centerPoint.x + 6} y={centerPoint.y - 6} fontSize="12" fill="#334155" pointerEvents="none">
                                            {edge.text}
                                        </text>
                                    )}

                                    {edge.comment && (
                                        <text x={centerPoint.x + 6} y={centerPoint.y + 12} fontSize="11" fill="#64748b" pointerEvents="none">
                                            📝
                                        </text>
                                    )}
                                </g>
                            );
                        })}

                        {guides.map((guide, index) => (
                            guide.axis === 'x' ? (
                                <line
                                    key={`guide-x-${index}`}
                                    x1={guide.pos} y1={0} x2={guide.pos} y2={WORLD_HEIGHT}
                                    stroke="#ec4899" strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom} ${4 / zoom}`} pointerEvents="none"
                                />
                            ) : (
                                <line
                                    key={`guide-y-${index}`}
                                    x1={0} y1={guide.pos} x2={WORLD_WIDTH} y2={guide.pos}
                                    stroke="#ec4899" strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom} ${4 / zoom}`} pointerEvents="none"
                                />
                            )
                        ))}

                        {marquee && (
                            <rect
                                x={marquee.x}
                                y={marquee.y}
                                width={marquee.width}
                                height={marquee.height}
                                fill="rgba(37,99,235,0.12)"
                                stroke="#2563eb"
                                strokeWidth={1 / zoom}
                                pointerEvents="none"
                            />
                        )}
                    </svg>

                    <div style={{ position: 'absolute', inset: 0 }}>
                        {localDoc.nodes.map((node) => {
                            const isSelected = selectedSet.has(node.id);
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
                                        setSelectedNodeIds([node.id]);
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

                        {resizeTarget && RESIZE_CORNERS.map(({ corner, cursor }) => {
                            const handleSize = 11 / zoom;
                            const cx = corner === 'nw' || corner === 'sw'
                                ? resizeTarget.position.x
                                : resizeTarget.position.x + resizeTarget.size.width;
                            const cy = corner === 'nw' || corner === 'ne'
                                ? resizeTarget.position.y
                                : resizeTarget.position.y + resizeTarget.size.height;
                            return (
                                <div
                                    key={corner}
                                    onMouseDown={(event) => onResizeHandleMouseDown(event, resizeTarget, corner)}
                                    style={{
                                        position: 'absolute',
                                        left: cx - handleSize / 2,
                                        top: cy - handleSize / 2,
                                        width: handleSize,
                                        height: handleSize,
                                        background: '#fff',
                                        border: `${2 / zoom}px solid #2563eb`,
                                        borderRadius: 2 / zoom,
                                        cursor,
                                        zIndex: 5
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>

                <div
                    onMouseDown={(event) => event.stopPropagation()}
                    style={{
                        position: 'absolute',
                        left: 12,
                        bottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        padding: 3,
                        borderRadius: 12,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-dim)',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.18)'
                    }}
                >
                    <button type="button" onClick={() => zoomByStep(1 / 1.2)} style={zoomControlButton} title="Alejar" aria-label="Alejar">−</button>
                    <button
                        type="button"
                        onClick={() => setViewport(1, panRef.current)}
                        style={{ ...zoomControlButton, width: 56, fontSize: 12, fontWeight: 700 }}
                        title="Restablecer zoom a 100%"
                    >
                        {Math.round(zoom * 100)}%
                    </button>
                    <button type="button" onClick={() => zoomByStep(1.2)} style={zoomControlButton} title="Acercar" aria-label="Acercar">+</button>
                    <div style={{ width: 1, height: 20, background: 'var(--border-dim)', margin: '0 2px' }} />
                    <button type="button" onClick={zoomToFit} style={{ ...zoomControlButton, width: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 600 }} title="Encuadrar todo">
                        Encuadrar
                    </button>
                </div>

                {!readOnly && (
                    <div
                        onMouseDown={(event) => event.stopPropagation()}
                        style={{
                            position: 'absolute',
                            right: 12,
                            bottom: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            padding: 3,
                            borderRadius: 12,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-dim)',
                            boxShadow: '0 6px 18px rgba(0,0,0,0.18)'
                        }}
                    >
                        <button type="button" onClick={undo} disabled={past.length === 0} style={{ ...zoomControlButton, opacity: past.length === 0 ? 0.4 : 1 }} title="Deshacer (Cmd/Ctrl+Z)" aria-label="Deshacer">↶</button>
                        <button type="button" onClick={redo} disabled={future.length === 0} style={{ ...zoomControlButton, opacity: future.length === 0 ? 0.4 : 1 }} title="Rehacer (Cmd/Ctrl+Shift+Z)" aria-label="Rehacer">↷</button>
                    </div>
                )}
            </div>

            <aside className="glass-panel" style={{ padding: 12, border: '1px solid var(--border-dim)' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {!readOnly && (
                        <>
                            <button className="btn-primary" onClick={addNodeCentered} style={{ padding: '6px 10px', fontSize: 12 }}>+ Nodo</button>
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
                                onClick={deleteSelection}
                                disabled={selectedNodeIds.length === 0 && !selectedEdge}
                                style={{ padding: '6px 10px', fontSize: 12, color: '#ef4444' }}
                            >
                                Eliminar
                            </button>
                        </>
                    )}
                    <button className="btn-ghost" onClick={exportAsPng} style={{ padding: '6px 10px', fontSize: 12 }}>Exportar PNG</button>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12, lineHeight: 1.5 }}>
                    Arrastrar en vacío para seleccionar varios · Shift+clic para sumar · Supr para borrar · Cmd/Ctrl+Z deshacer · Cmd/Ctrl+D duplicar · flechas para mover.
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

                {selectedNodeIds.length > 1 && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        {selectedNodeIds.length} nodos seleccionados
                    </div>
                )}

                {selectedNode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Nodo seleccionado</div>

                        <label style={{ fontSize: 12 }}>Texto</label>
                        <textarea
                            className="input-glass"
                            value={selectedNode.content}
                            onChange={(event) => updateNode(selectedNode.id, { content: event.target.value }, true)}
                            disabled={readOnly}
                            rows={2}
                        />

                        <label style={{ fontSize: 12 }}>Comentario</label>
                        <textarea
                            className="input-glass"
                            value={selectedNode.comment || ''}
                            onChange={(event) => updateNode(selectedNode.id, { comment: event.target.value }, true)}
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
                            onChange={(event) => updateNode(selectedNode.id, { style: { fill: event.target.value } }, true)}
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
                            onChange={(event) => updateEdge(selectedEdge.id, { text: event.target.value }, true)}
                            disabled={readOnly}
                            placeholder="Ej: Sí / No"
                        />

                        <label style={{ fontSize: 12 }}>Comentario</label>
                        <textarea
                            className="input-glass"
                            value={selectedEdge.comment || ''}
                            onChange={(event) => updateEdge(selectedEdge.id, { comment: event.target.value }, true)}
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

                {selectedNodeIds.length === 0 && !selectedEdge && (
                    <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.5 }}>
                        Doble clic en el lienzo para crear un nodo. Selecciona nodos o conexiones para editar contenido, estilo y comentarios.
                    </div>
                )}
            </aside>
        </div>
    );
}
