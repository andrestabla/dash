"use client";

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Circle as CircleIcon,
    Database as DatabaseIcon,
    Diamond as DiamondIcon,
    Download as DownloadIcon,
    FileText as FileTextIcon,
    Frame as FrameIcon,
    Link2 as LinkIcon,
    Pencil as PencilIcon,
    Pill as PillIcon,
    Shapes as ShapesIcon,
    Smile as SmileIcon,
    Square as SquareIcon,
    StickyNote as StickyNoteIcon,
    Trash2 as TrashIcon,
    Type as TypeIcon
} from "lucide-react";

// The icon picker pulls the whole lucide library; keep it out of the canvas's
// initial bundle (public viewers never need it).
const IconPicker = lazy(() => import("./IconPicker"));
import type {
    CanvasDocument,
    CanvasEdge,
    CanvasFontScale,
    CanvasLineStyle,
    CanvasNode,
    CanvasNodeStyle,
    CanvasNodeType,
    CanvasPoint,
    CanvasPort,
    CanvasSize
} from "@/lib/canvas";
import { getNearestPort, getNodeRect, getPortPoint, normalizeCanvasDocument, MAX_COMMENT_IMAGES } from "@/lib/canvas";

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

type EdgeEndpointDrag = { edgeId: string; end: 'source' | 'target' };
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
const MAX_COMMENT_IMAGE_DIM = 900;

type LucideIcon = typeof SquareIcon;

const NODE_TYPE_OPTIONS: Array<{ value: CanvasNodeType; label: string; icon: LucideIcon }> = [
    { value: 'rectangle', label: 'Proceso', icon: SquareIcon },
    { value: 'pill', label: 'Inicio/Fin', icon: PillIcon },
    { value: 'diamond', label: 'Decisión', icon: DiamondIcon },
    { value: 'parallelogram', label: 'Entrada/Salida', icon: ShapesIcon },
    { value: 'document', label: 'Documento', icon: FileTextIcon },
    { value: 'cylinder', label: 'Base de datos', icon: DatabaseIcon },
    { value: 'circle', label: 'Círculo', icon: CircleIcon },
    { value: 'sticky', label: 'Sticky', icon: StickyNoteIcon },
    { value: 'frame', label: 'Frame', icon: FrameIcon },
    { value: 'text', label: 'Texto', icon: TypeIcon },
    { value: 'icon', label: 'Ícono', icon: SmileIcon }
];

const CONNECTION_STYLE_OPTIONS: Array<{ value: CanvasLineStyle; label: string }> = [
    { value: 'orthogonal', label: 'Ortogonal' },
    { value: 'straight', label: 'Recta' },
    { value: 'bezier', label: 'Curva' }
];

// Opinionated, curated palette — no free-form hex picker, so every board stays coherent.
const CURATED_COLORS = [
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#ec4899', '#ef4444', '#f97316', '#f59e0b',
    '#eab308', '#22c55e', '#10b981', '#14b8a6',
    '#0ea5e9', '#64748b', '#1e293b', '#fde68a'
];

const TEXT_COLORS = ['#0f172a', '#ffffff', '#334155', '#2563eb', '#dc2626', '#15803d', '#b45309', '#7c3aed'];

// First entry is the connector default; selecting it clears the custom color.
const EDGE_COLORS = [
    '#64748b', '#0f172a', '#475569', '#94a3b8',
    '#1d4ed8', '#2563eb', '#3b82f6', '#0ea5e9',
    '#0891b2', '#14b8a6', '#10b981', '#22c55e',
    '#15803d', '#eab308', '#b45309', '#f97316',
    '#ea580c', '#dc2626', '#ef4444', '#db2777',
    '#ec4899', '#a855f7', '#8b5cf6', '#7c3aed'
];

const FONT_SCALE_PX: Record<CanvasFontScale, number> = { sm: 13, md: 16, lg: 22, xl: 30 };
const FONT_SCALE_OPTIONS: Array<{ value: CanvasFontScale; label: string }> = [
    { value: 'sm', label: 'S' },
    { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' },
    { value: 'xl', label: 'XL' }
];

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function fontPx(node: CanvasNode): number {
    return FONT_SCALE_PX[node.style.fontScale ?? 'md'];
}

function defaultTextColor(type: CanvasNodeType): string {
    return type === 'sticky' || type === 'frame' || type === 'text' ? '#0f172a' : '#ffffff';
}

function nodeTextColor(node: CanvasNode): string {
    return node.style.textColor ?? defaultTextColor(node.type);
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

function pointInNode(point: CanvasPoint, node: CanvasNode): boolean {
    return point.x >= node.position.x && point.x <= node.position.x + node.size.width &&
        point.y >= node.position.y && point.y <= node.position.y + node.size.height;
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

// Outward unit normal for a port — the direction a connector must travel to
// leave (or the reverse to enter) that side of a node squarely.
function portNormal(port: CanvasPort): CanvasPoint {
    if (port === 'top') return { x: 0, y: -1 };
    if (port === 'bottom') return { x: 0, y: 1 };
    if (port === 'left') return { x: -1, y: 0 };
    return { x: 1, y: 0 };
}

// Drops consecutive duplicate points so the rendered path and its arrowhead
// orientation stay well-defined when segments collapse.
function dedupePoints(points: CanvasPoint[]): CanvasPoint[] {
    const out: CanvasPoint[] = [];
    for (const p of points) {
        const last = out[out.length - 1];
        if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
        out.push(p);
    }
    return out;
}

// Length of the perpendicular stub every connector grows out of a port. Kept
// longer than the arrowhead so the marker always sits on a straight segment.
const EDGE_PORT_STUB = 26;

function buildOrthogonalPoints(edge: CanvasEdge, nodesById: Map<string, CanvasNode>, obstacles: CanvasNode[]): CanvasPoint[] {
    const sourceNode = nodesById.get(edge.source.nodeId);
    const targetNode = nodesById.get(edge.target.nodeId);
    if (!sourceNode || !targetNode) return [];

    const start = getPortPoint(sourceNode, edge.source.port);
    const end = getPortPoint(targetNode, edge.target.port);
    const sn = portNormal(edge.source.port);
    const tn = portNormal(edge.target.port);

    // Step out of each port along its normal. The connector always leaves the
    // source and meets the target perpendicular to the node edge, so the
    // arrowhead (oriented to the final segment) points exactly at the element.
    const s1 = { x: start.x + sn.x * EDGE_PORT_STUB, y: start.y + sn.y * EDGE_PORT_STUB };
    const t1 = { x: end.x + tn.x * EDGE_PORT_STUB, y: end.y + tn.y * EDGE_PORT_STUB };

    const sHoriz = sn.y === 0;
    const tHoriz = tn.y === 0;

    const route = (offset: number): CanvasPoint[] => {
        if (sHoriz && tHoriz) {
            const midX = (s1.x + t1.x) / 2 + offset;
            return [start, s1, { x: midX, y: s1.y }, { x: midX, y: t1.y }, t1, end];
        }
        if (!sHoriz && !tHoriz) {
            const midY = (s1.y + t1.y) / 2 + offset;
            return [start, s1, { x: s1.x, y: midY }, { x: t1.x, y: midY }, t1, end];
        }
        if (sHoriz && !tHoriz) {
            return [start, s1, { x: t1.x, y: s1.y }, t1, end];
        }
        return [start, s1, { x: s1.x, y: t1.y }, t1, end];
    };

    const base = route(0);
    if (!pathHasCollision(base, obstacles, sourceNode.id, targetNode.id)) return dedupePoints(base);

    // The straight midline crosses another element — slide it aside while
    // keeping the perpendicular port stubs intact.
    for (const offset of [56, -56, 112, -112]) {
        const alt = route(offset);
        if (!pathHasCollision(alt, obstacles, sourceNode.id, targetNode.id)) return dedupePoints(alt);
    }
    return dedupePoints(base);
}

function pointsToPolylinePath(points: CanvasPoint[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function buildBezierPath(start: CanvasPoint, end: CanvasPoint, sn: CanvasPoint, tn: CanvasPoint): string {
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    // Pull the control points straight out along each port normal so the curve
    // leaves the source and enters the target perpendicular to the node edge —
    // this makes the arrowhead point precisely at the connected element.
    const reach = Math.max(40, Math.min(160, dist * 0.5));
    const c1 = { x: start.x + sn.x * reach, y: start.y + sn.y * reach };
    const c2 = { x: end.x + tn.x * reach, y: end.y + tn.y * reach };

    return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
}

function getNodeBaseStyle(node: CanvasNode): React.CSSProperties {
    if (node.type === 'text' || node.type === 'icon') {
        return { borderRadius: 0, boxShadow: 'none', background: 'transparent' };
    }

    if (node.type === 'sticky') {
        return {
            borderRadius: 8,
            boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
            background: '#fde68a'
        };
    }

    if (node.type === 'frame') {
        return {
            borderRadius: 12,
            boxShadow: 'none',
            background: 'rgba(255,255,255,0.12)'
        };
    }

    if (node.type === 'circle') {
        return { borderRadius: '9999px', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', background: node.style.fill };
    }

    if (node.type === 'pill') {
        return { borderRadius: 9999, boxShadow: '0 8px 20px rgba(0,0,0,0.2)', background: node.style.fill };
    }

    if (node.type === 'diamond') {
        return {
            borderRadius: 0,
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            background: node.style.fill,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
        };
    }

    if (node.type === 'parallelogram') {
        return {
            borderRadius: 8,
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            background: node.style.fill,
            clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)'
        };
    }

    if (node.type === 'document') {
        return {
            borderRadius: 8,
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            background: node.style.fill,
            clipPath: 'polygon(0 0, 86% 0, 100% 16%, 100% 100%, 0 100%)'
        };
    }

    if (node.type === 'cylinder') {
        return {
            borderRadius: 999,
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            background: node.style.fill
        };
    }

    return {
        borderRadius: node.style.radius,
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

// Reads an image file, downscales it (so the canvas document stays light) and
// returns a JPEG data URL.
function fileToScaledDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('read failed'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('decode failed'));
            img.onload = () => {
                const scale = Math.min(1, MAX_COMMENT_IMAGE_DIM / Math.max(img.width, img.height));
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('no ctx')); return; }
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
}

const RESIZE_CORNERS: Array<{ corner: ResizeCorner; cursor: string }> = [
    { corner: 'nw', cursor: 'nwse-resize' },
    { corner: 'ne', cursor: 'nesw-resize' },
    { corner: 'sw', cursor: 'nesw-resize' },
    { corner: 'se', cursor: 'nwse-resize' }
];

function PanelSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div style={{ border: '1px solid var(--border-dim)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-card)' }}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: 'var(--bg-panel)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    color: 'var(--text-dim)'
                }}
            >
                <span>{title}</span>
                <span style={{ fontSize: 10 }}>{open ? '▾' : '▸'}</span>
            </button>
            {open && (
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {children}
                </div>
            )}
        </div>
    );
}

export default function CollaborativeCanvas({ canvasDocument, onChange, readOnly = false, accentColor = '#3b82f6' }: Props) {
    const normalizedExternalDoc = useMemo(() => normalizeCanvasDocument(canvasDocument), [canvasDocument]);
    const [localDoc, setLocalDoc] = useState<CanvasDocument>(() => cloneDocument(normalizedExternalDoc));
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [linkFrom, setLinkFrom] = useState<{ nodeId: string; port: CanvasPort; lineStyle: CanvasLineStyle } | null>(null);
    const [newConnectionStyle, setNewConnectionStyle] = useState<CanvasLineStyle>('orthogonal');
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingNodeContent, setEditingNodeContent] = useState('');
    const [editorOpen, setEditorOpen] = useState(false);
    const [openCommentNodeId, setOpenCommentNodeId] = useState<string | null>(null);
    const [commentModalEditing, setCommentModalEditing] = useState(false);
    // Fullscreen image viewer for comment images, so users can inspect detail.
    // Holds the image set and the index currently shown, or null when closed.
    const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
    // Index of the comment image currently shown in the view-mode slider.
    const [commentSlide, setCommentSlide] = useState(0);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [editingCommentImages, setEditingCommentImages] = useState<string[]>([]);

    // Viewport state.
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState<CanvasPoint>({ x: 0, y: 0 });
    const [isSpaceDown, setIsSpaceDown] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [guides, setGuides] = useState<AlignmentGuide[]>([]);

    // Mobile / narrow-screen layout: the tools panel becomes a bottom sheet.
    const [isCompact, setIsCompact] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);

    // Icon picker: `'insert'` opens it to drop a new icon node at the centre;
    // `{ replaceNodeId }` opens it to swap the icon on an existing node.
    const [iconPickerMode, setIconPickerMode] = useState<null | 'insert' | { replaceNodeId: string }>(null);

    // Editing state.
    const [past, setPast] = useState<CanvasDocument[]>([]);
    const [future, setFuture] = useState<CanvasDocument[]>([]);
    const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
    const [edgeDragWorld, setEdgeDragWorld] = useState<CanvasPoint | null>(null);

    const dragRef = useRef<DragState | null>(null);
    const panDragRef = useRef<PanDragState | null>(null);
    const resizeRef = useRef<ResizeState | null>(null);
    const marqueeRef = useRef<MarqueeState | null>(null);
    const edgeEndpointDragRef = useRef<EdgeEndpointDrag | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const commentFileInputRef = useRef<HTMLInputElement | null>(null);
    const zoomRef = useRef(1);
    const panRef = useRef<CanvasPoint>({ x: 0, y: 0 });
    const isSpaceDownRef = useRef(false);
    const suppressClickRef = useRef(false);
    // Touch state: number of fingers down, and the active pinch-zoom gesture.
    const activeTouchesRef = useRef(0);
    const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);

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
    useEffect(() => {
        if (selectedNodeIds.length !== 1 && !selectedEdgeId) setEditorOpen(false);
    }, [selectedNodeIds, selectedEdgeId]);
    useEffect(() => { pastRef.current = past; }, [past]);
    useEffect(() => { futureRef.current = future; }, [future]);
    useEffect(() => { editingNodeIdRef.current = editingNodeId; }, [editingNodeId]);

    // Track narrow viewports so the editing tools collapse into a bottom sheet.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(max-width: 860px)');
        const update = () => setIsCompact(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    // Fullscreen comment-image viewer: Escape closes it, arrows navigate.
    useEffect(() => {
        if (!lightbox) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                setLightbox(null);
            } else if (event.key === 'ArrowLeft') {
                event.stopPropagation();
                setLightbox((lb) => (lb ? { ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length } : lb));
            } else if (event.key === 'ArrowRight') {
                event.stopPropagation();
                setLightbox((lb) => (lb ? { ...lb, index: (lb.index + 1) % lb.images.length } : lb));
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [lightbox]);

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

    const nodesWithChildren = useMemo(
        () => new Set(localDoc.edges.map((edge) => edge.source.nodeId)),
        [localDoc.edges]
    );

    const hiddenNodeIds = useMemo(() => {
        const childrenMap = new Map<string, string[]>();
        for (const edge of localDoc.edges) {
            const arr = childrenMap.get(edge.source.nodeId) || [];
            arr.push(edge.target.nodeId);
            childrenMap.set(edge.source.nodeId, arr);
        }
        const hidden = new Set<string>();
        for (const node of localDoc.nodes) {
            if (!node.collapsed) continue;
            const stack = [...(childrenMap.get(node.id) || [])];
            while (stack.length) {
                const id = stack.pop() as string;
                if (hidden.has(id)) continue;
                hidden.add(id);
                for (const child of childrenMap.get(id) || []) stack.push(child);
            }
        }
        return hidden;
    }, [localDoc.nodes, localDoc.edges]);

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
        const visible = localDoc.nodes.filter((node) => !hiddenNodeIds.has(node.id));
        if (visible.length === 0) {
            setViewport(1, { x: 40, y: 40 });
            return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of visible) {
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
    }, [localDoc.nodes, hiddenNodeIds, setViewport]);

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

    const toggleCollapse = (nodeId: string) => {
        const next = cloneDocument(localDocRef.current);
        next.nodes = next.nodes.map((node) => node.id === nodeId ? { ...node, collapsed: !node.collapsed } : node);
        if (readOnly) {
            // Public viewers may fold/unfold branches locally; never persisted.
            localDocRef.current = next;
            setLocalDoc(next);
            return;
        }
        commitWithHistory(next);
    };

    const addNode = (x = 240, y = 180, type: CanvasNodeType = 'rectangle') => {
        if (readOnly) return;

        const isSticky = type === 'sticky';
        const isFrame = type === 'frame';
        const isText = type === 'text';
        const next = cloneDocument(localDocRef.current);
        const id = makeNodeId();
        next.nodes.push({
            id,
            type,
            position: { x: Math.max(0, x), y: Math.max(0, y) },
            size: {
                width: isFrame ? 420 : (isText ? 200 : (isSticky ? 200 : 220)),
                height: isFrame ? 260 : (isText ? 48 : (isSticky ? 150 : 88))
            },
            style: { fill: isSticky ? '#fde68a' : accentColor, radius: 12, fontScale: 'md' },
            // A new frame starts with no label; it is a container, not a card.
            content: isFrame ? '' : (isText ? 'Texto' : 'Nuevo nodo')
        });
        commitWithHistory(next);
        setSelectedNodeIds([id]);
        setSelectedEdgeId(null);
    };

    const addTypeCentered = (type: CanvasNodeType) => {
        if (type === 'icon') {
            // Icons need a specific glyph — defer to the picker instead of
            // dropping an empty placeholder onto the canvas.
            setIconPickerMode('insert');
            return;
        }
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) {
            addNode(240, 180, type);
            return;
        }
        const center = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
        addNode(center.x - 110, center.y - 44, type);
    };

    // Drops a new icon node at the centre of the viewport, populated with the
    // SVG string emitted by the picker.
    const insertIconCentered = (iconSvg: string) => {
        if (readOnly) return;
        const rect = viewportRef.current?.getBoundingClientRect();
        let x = 240;
        let y = 180;
        if (rect) {
            const c = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
            x = c.x - 48;
            y = c.y - 48;
        }
        const next = cloneDocument(localDocRef.current);
        const id = makeNodeId();
        next.nodes.push({
            id,
            type: 'icon',
            position: { x: Math.max(0, x), y: Math.max(0, y) },
            size: { width: 96, height: 96 },
            style: { fill: accentColor, radius: 12, fontScale: 'md' },
            content: '',
            iconSvg
        });
        commitWithHistory(next);
        setSelectedNodeIds([id]);
        setSelectedEdgeId(null);
    };

    // Swaps the glyph on an existing icon node (also coerces other node types
    // into an icon if the user re-picks one from the edit modal).
    const replaceNodeIcon = (nodeId: string, iconSvg: string) => {
        if (readOnly) return;
        const next = cloneDocument(localDocRef.current);
        next.nodes = next.nodes.map((node) => node.id === nodeId
            ? { ...node, type: 'icon' as const, iconSvg }
            : node
        );
        commitWithHistory(next);
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

    // Z-order: the node array order is the paint order (later = on top).
    // Moving a node within the array brings it forward or sends it back.
    const reorderNode = (nodeId: string, mode: 'front' | 'forward' | 'backward' | 'back') => {
        if (readOnly) return;
        const next = cloneDocument(localDocRef.current);
        const idx = next.nodes.findIndex((node) => node.id === nodeId);
        if (idx === -1) return;
        const [node] = next.nodes.splice(idx, 1);
        if (mode === 'front') {
            next.nodes.push(node);
        } else if (mode === 'back') {
            next.nodes.unshift(node);
        } else if (mode === 'forward') {
            next.nodes.splice(Math.min(next.nodes.length, idx + 1), 0, node);
        } else {
            next.nodes.splice(Math.max(0, idx - 1), 0, node);
        }
        commitWithHistory(next);
    };

    // Same idea for connectors. Edges always paint beneath nodes (separate SVG
    // layer), so this only changes the order among overlapping connectors.
    const reorderEdge = (edgeId: string, mode: 'front' | 'forward' | 'backward' | 'back') => {
        if (readOnly) return;
        const next = cloneDocument(localDocRef.current);
        const idx = next.edges.findIndex((edge) => edge.id === edgeId);
        if (idx === -1) return;
        const [edge] = next.edges.splice(idx, 1);
        if (mode === 'front') {
            next.edges.push(edge);
        } else if (mode === 'back') {
            next.edges.unshift(edge);
        } else if (mode === 'forward') {
            next.edges.splice(Math.min(next.edges.length, idx + 1), 0, edge);
        } else {
            next.edges.splice(Math.max(0, idx - 1), 0, edge);
        }
        commitWithHistory(next);
    };

    // Aligns the horizontal edges/centres of every selected node to a shared
    // reference derived from the current selection.
    const alignSelection = (mode: 'left' | 'centerX' | 'right') => {
        if (readOnly) return;
        const idSet = new Set(selectedNodeIdsRef.current);
        const selected = localDocRef.current.nodes.filter((node) => idSet.has(node.id));
        if (selected.length < 2) return;

        let targetX: (node: CanvasNode) => number;
        if (mode === 'left') {
            const minX = Math.min(...selected.map((node) => node.position.x));
            targetX = () => minX;
        } else if (mode === 'right') {
            const maxRight = Math.max(...selected.map((node) => node.position.x + node.size.width));
            targetX = (node) => maxRight - node.size.width;
        } else {
            const avgCenter = selected.reduce((sum, node) => sum + node.position.x + node.size.width / 2, 0) / selected.length;
            targetX = (node) => avgCenter - node.size.width / 2;
        }

        const next = cloneDocument(localDocRef.current);
        next.nodes = next.nodes.map((node) => idSet.has(node.id)
            ? { ...node, position: { x: Math.max(0, Math.round(targetX(node))), y: node.position.y } }
            : node
        );
        commitWithHistory(next);
    };

    const finishInlineEdit = () => {
        if (!editingNodeId) return;
        const isFrame = nodesById.get(editingNodeId)?.type === 'frame';
        // trim() drops surrounding whitespace while keeping internal line
        // breaks, so multi-line text survives. Frames may end up empty.
        const trimmed = editingNodeContent.trim();
        const content = isFrame ? trimmed : (trimmed || 'Nodo');
        updateNode(editingNodeId, { content });
        setEditingNodeId(null);
    };

    const openCommentModal = (node: CanvasNode, editing: boolean) => {
        setOpenCommentNodeId(node.id);
        setEditingCommentText(node.comment ?? '');
        setEditingCommentImages(node.commentImages ?? []);
        setCommentSlide(0);
        setCommentModalEditing(editing && !readOnly);
    };

    const closeCommentModal = () => {
        setOpenCommentNodeId(null);
        setCommentModalEditing(false);
        setEditingCommentImages([]);
    };

    const beginCommentEditingInModal = () => {
        if (readOnly || !openCommentNodeId) return;
        const node = nodesById.get(openCommentNodeId);
        setEditingCommentText(node?.comment ?? '');
        setEditingCommentImages(node?.commentImages ?? []);
        setCommentModalEditing(true);
    };

    const saveCommentModal = () => {
        const id = openCommentNodeId;
        if (!id) return;
        const text = editingCommentText.trim();
        const images = editingCommentImages;
        const next = cloneDocument(localDocRef.current);
        next.nodes = next.nodes.map((node) => node.id === id
            ? { ...node, comment: text ? text : undefined, commentImages: images.length > 0 ? images : undefined }
            : node
        );
        commitWithHistory(next);
        setCommentModalEditing(false);
        setCommentSlide(0);
        if (!text && images.length === 0) setOpenCommentNodeId(null);
    };

    const cancelCommentModal = () => {
        const node = openCommentNodeId ? nodesById.get(openCommentNodeId) : null;
        if (!node || (node.comment === undefined && node.commentImages === undefined)) {
            closeCommentModal();
        } else {
            setCommentModalEditing(false);
            setEditingCommentImages([]);
        }
    };

    // Scale and append image files to the comment, capped at MAX_COMMENT_IMAGES.
    const handleCommentImageFiles = (files: FileList | File[] | null | undefined) => {
        const list = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
        if (list.length === 0) return;
        Promise.all(list.map((file) => fileToScaledDataUrl(file).catch(() => null)))
            .then((urls) => {
                const valid = urls.filter((url): url is string => Boolean(url));
                if (valid.length === 0) return;
                setEditingCommentImages((prev) => [...prev, ...valid].slice(0, MAX_COMMENT_IMAGES));
            });
    };

    const onCommentPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = event.clipboardData?.items;
        if (!items) return;
        const files: File[] = [];
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) files.push(file);
            }
        }
        if (files.length > 0) {
            event.preventDefault();
            handleCommentImageFiles(files);
        }
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

    const onViewportMouseDown = (event: React.PointerEvent<HTMLDivElement>) => {
        // Secondary fingers are reserved for pinch-zoom, handled via touch events.
        if (event.pointerType === 'touch' && activeTouchesRef.current >= 1) return;
        if (isSpaceDownRef.current || event.button === 1) {
            event.preventDefault();
            startPan(event.clientX, event.clientY);
            return;
        }
        if (event.button !== 0) return;
        if (readOnly) {
            // Public viewers pan the canvas with a plain left-drag.
            startPan(event.clientX, event.clientY);
            return;
        }
        const world = screenToWorld(event.clientX, event.clientY);
        marqueeRef.current = { startX: world.x, startY: world.y, moved: false };
        setMarquee({ x: world.x, y: world.y, width: 0, height: 0 });
    };

    const onViewportDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly || isSpaceDownRef.current) return;
        const world = screenToWorld(event.clientX, event.clientY);
        addNode(world.x - 110, world.y - 44, 'rectangle');
    };

    const onNodeMouseDown = (event: React.PointerEvent<HTMLDivElement>, node: CanvasNode) => {
        event.stopPropagation();
        // Secondary fingers are reserved for pinch-zoom.
        if (event.pointerType === 'touch' && activeTouchesRef.current >= 1) return;

        if (isSpaceDownRef.current || event.button === 1) {
            event.preventDefault();
            startPan(event.clientX, event.clientY);
            return;
        }
        if (event.button !== 0) return;

        if (readOnly) {
            // Public viewers pan with a plain left-drag, even starting on a node.
            startPan(event.clientX, event.clientY);
            return;
        }

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

        if (event.shiftKey) {
            const nextSelection = selectedNodeIdsRef.current.includes(node.id)
                ? selectedNodeIdsRef.current.filter((id) => id !== node.id)
                : [...selectedNodeIdsRef.current, node.id];
            setSelectedNodeIds(nextSelection);
            setSelectedEdgeId(null);
            return;
        }

        const nextSelection = selectedNodeIdsRef.current.includes(node.id)
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

    const onResizeHandleMouseDown = (event: React.PointerEvent<HTMLDivElement>, node: CanvasNode, corner: ResizeCorner) => {
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

    const onEdgeEndpointMouseDown = (event: React.PointerEvent<HTMLDivElement>, edgeId: string, end: 'source' | 'target') => {
        if (readOnly) return;
        event.stopPropagation();
        event.preventDefault();
        pushHistory();
        edgeEndpointDragRef.current = { edgeId, end };
        setEdgeDragWorld(screenToWorld(event.clientX, event.clientY));
    };

    // Touch gestures: a single finger pans/drags through the pointer-event
    // handlers above; two fingers run a combined pinch-zoom + pan handled here.
    const onViewportTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
        activeTouchesRef.current = event.touches.length;
        if (event.touches.length === 2) {
            // Drop any single-finger interaction the first touch may have begun.
            panDragRef.current = null;
            dragRef.current = null;
            resizeRef.current = null;
            edgeEndpointDragRef.current = null;
            marqueeRef.current = null;
            setMarquee(null);
            setIsPanning(false);
            setGuides([]);
            const a = event.touches[0];
            const b = event.touches[1];
            pinchRef.current = {
                dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1,
                cx: (a.clientX + b.clientX) / 2,
                cy: (a.clientY + b.clientY) / 2
            };
        }
    };

    const onViewportTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
        const pinch = pinchRef.current;
        if (!pinch || event.touches.length !== 2) return;
        const a = event.touches[0];
        const b = event.touches[1];
        const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1;
        const cx = (a.clientX + b.clientX) / 2;
        const cy = (a.clientY + b.clientY) / 2;
        // Incremental zoom anchored on the finger midpoint.
        zoomToward(zoomRef.current * (dist / pinch.dist), cx, cy);
        // Incremental pan following the midpoint drift, so two fingers can also
        // move around the canvas — the only pan gesture available to editors.
        const nextPan = { x: panRef.current.x + (cx - pinch.cx), y: panRef.current.y + (cy - pinch.cy) };
        panRef.current = nextPan;
        setPan(nextPan);
        pinch.dist = dist;
        pinch.cx = cx;
        pinch.cy = cy;
    };

    const onViewportTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
        activeTouchesRef.current = event.touches.length;
        if (event.touches.length < 2) pinchRef.current = null;
    };

    useEffect(() => {
        const onMouseMove = (event: PointerEvent) => {
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

            if (edgeEndpointDragRef.current) {
                setEdgeDragWorld(screenToWorld(event.clientX, event.clientY));
                return;
            }

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

        const onMouseUp = (event: PointerEvent) => {
            if (panDragRef.current) {
                if (panDragRef.current.moved) suppressClickRef.current = true;
                panDragRef.current = null;
                setIsPanning(false);
            }
            if (edgeEndpointDragRef.current) {
                const drag = edgeEndpointDragRef.current;
                edgeEndpointDragRef.current = null;
                setEdgeDragWorld(null);
                const world = screenToWorld(event.clientX, event.clientY);
                const target = [...localDocRef.current.nodes]
                    .filter((node) => !hiddenNodeIds.has(node.id))
                    .reverse()
                    .find((node) => pointInNode(world, node));
                if (target) {
                    const next = cloneDocument(localDocRef.current);
                    next.edges = next.edges.map((edge) => {
                        if (edge.id !== drag.edgeId) return edge;
                        const endpoint = { nodeId: target.id, port: getNearestPort(target, world) };
                        return drag.end === 'source'
                            ? { ...edge, source: endpoint }
                            : { ...edge, target: endpoint };
                    });
                    commit(next);
                }
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
                        .filter((node) => !hiddenNodeIds.has(node.id))
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

        window.addEventListener('pointermove', onMouseMove);
        window.addEventListener('pointerup', onMouseUp);
        window.addEventListener('pointercancel', onMouseUp);

        return () => {
            window.removeEventListener('pointermove', onMouseMove);
            window.removeEventListener('pointerup', onMouseUp);
            window.removeEventListener('pointercancel', onMouseUp);
        };
    }, [readOnly, editingNodeId, nodesById, screenToWorld, commit, hiddenNodeIds]);

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

        doc.edges.forEach((edge) => {
            if (hiddenNodeIds.has(edge.source.nodeId) || hiddenNodeIds.has(edge.target.nodeId)) return;
            const source = nodesMap.get(edge.source.nodeId);
            const target = nodesMap.get(edge.target.nodeId);
            if (!source || !target) return;

            const start = getPortPoint(source, edge.source.port);
            const end = getPortPoint(target, edge.target.port);

            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2;
            ctx.setLineDash(edge.dashed ? [9, 7] : []);

            if (edge.lineStyle === 'bezier') {
                const sn = portNormal(edge.source.port);
                const tn = portNormal(edge.target.port);
                const reach = Math.max(40, Math.min(160, Math.hypot(end.x - start.x, end.y - start.y) * 0.5));
                const c1 = { x: start.x + sn.x * reach, y: start.y + sn.y * reach };
                const c2 = { x: end.x + tn.x * reach, y: end.y + tn.y * reach };
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
                ctx.stroke();
                ctx.setLineDash([]);
                return;
            }

            const points = edge.lineStyle === 'straight'
                ? [start, end]
                : buildOrthogonalPoints(edge, nodesMap, doc.nodes);

            if (points.length >= 2) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        });

        doc.nodes.forEach((node) => {
            if (hiddenNodeIds.has(node.id)) return;
            if (node.type === 'icon') {
                // The 2D context can't rasterise an embedded SVG synchronously;
                // leave a faint outline so the layout still shows the icon's spot.
                ctx.save();
                ctx.strokeStyle = node.style.stroke || node.style.fill || '#94a3b8';
                ctx.lineWidth = 1;
                ctx.strokeRect(node.position.x, node.position.y, node.size.width, node.size.height);
                ctx.restore();
                return;
            }
            if (node.type !== 'text') {
                ctx.fillStyle = node.type === 'sticky' ? '#fde68a' : (node.style.fill || '#3b82f6');
                ctx.fillRect(node.position.x, node.position.y, node.size.width, node.size.height);
                ctx.strokeStyle = node.style.stroke || '#0f172a';
                ctx.strokeRect(node.position.x, node.position.y, node.size.width, node.size.height);
            }

            ctx.fillStyle = nodeTextColor(node);
            ctx.font = `bold ${fontPx(node)}px sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.fillText(node.content.replace(/\s+/g, ' ').trim().slice(0, 34), node.position.x + 14, node.position.y + node.size.height / 2);
        });

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `canvas-${Date.now()}.png`;
        link.click();
    };

    const viewportCursor = isPanning ? 'grabbing' : (isSpaceDown ? 'grab' : 'default');
    const selectedSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
    const resizeTarget = (!readOnly && !editingNodeId && selectedNodeIds.length === 1) ? selectedNode : null;
    const visibleNodes = useMemo(() => localDoc.nodes.filter((node) => !hiddenNodeIds.has(node.id)), [localDoc.nodes, hiddenNodeIds]);

    // Endpoint handles for the selected connector.
    const selectedEdgeEndpoints = useMemo(() => {
        if (!selectedEdge) return null;
        const sourceNode = nodesById.get(selectedEdge.source.nodeId);
        const targetNode = nodesById.get(selectedEdge.target.nodeId);
        if (!sourceNode || !targetNode) return null;
        if (hiddenNodeIds.has(sourceNode.id) || hiddenNodeIds.has(targetNode.id)) return null;
        return {
            source: getPortPoint(sourceNode, selectedEdge.source.port),
            target: getPortPoint(targetNode, selectedEdge.target.port)
        };
    }, [selectedEdge, nodesById, hiddenNodeIds]);

    const edgeDragAnchor = useMemo(() => {
        const drag = edgeEndpointDragRef.current;
        if (!drag || !edgeDragWorld || !selectedEdgeEndpoints) return null;
        return drag.end === 'source' ? selectedEdgeEndpoints.target : selectedEdgeEndpoints.source;
    }, [edgeDragWorld, selectedEdgeEndpoints]);

    const zoomControlButton: React.CSSProperties = {
        width: isCompact ? 38 : 30,
        height: isCompact ? 38 : 30,
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

    const miniBtn: React.CSSProperties = {
        flex: 1,
        padding: '6px 4px',
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap'
    };

    const editorLabel: React.CSSProperties = {
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-main, #0f172a)'
    };

    const swatchGrid: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 5,
        marginTop: 4
    };

    function swatchStyle(active: boolean, color: string): React.CSSProperties {
        return {
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: 7,
            background: color,
            cursor: 'pointer',
            border: active ? '2px solid var(--text-main, #0f172a)' : '1px solid rgba(0,0,0,0.15)',
            outline: active ? '2px solid #fff' : 'none',
            outlineOffset: -3
        };
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: (readOnly || isCompact) ? '1fr' : '1fr 320px', gap: 12, height: '100%', minHeight: isCompact ? 420 : 560, position: 'relative' }}>
            <input
                ref={commentFileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(event) => {
                    handleCommentImageFiles(event.target.files);
                    event.target.value = '';
                }}
            />
            <div
                ref={viewportRef}
                onPointerDown={onViewportMouseDown}
                onDoubleClick={onViewportDoubleClick}
                onTouchStart={onViewportTouchStart}
                onTouchMove={onViewportTouchMove}
                onTouchEnd={onViewportTouchEnd}
                onTouchCancel={onViewportTouchEnd}
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 16,
                    border: '1px solid var(--border-dim)',
                    minHeight: isCompact ? 360 : 520,
                    height: '100%',
                    backgroundColor: 'var(--bg-card)',
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.35) 1px, transparent 0)',
                    backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`,
                    cursor: viewportCursor,
                    // Stop the browser from scrolling/zooming the page so the
                    // canvas owns every touch gesture.
                    touchAction: 'none'
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
                                <path d="M0,0 L8,4 L0,8 Z" fill="context-stroke" />
                            </marker>
                            <marker id="arrow-start" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto" markerUnits="strokeWidth">
                                <path d="M8,0 L0,4 L8,8 Z" fill="context-stroke" />
                            </marker>
                        </defs>

                        {localDoc.edges.map((edge) => {
                            if (hiddenNodeIds.has(edge.source.nodeId) || hiddenNodeIds.has(edge.target.nodeId)) return null;
                            const sourceNode = nodesById.get(edge.source.nodeId);
                            const targetNode = nodesById.get(edge.target.nodeId);
                            if (!sourceNode || !targetNode) return null;

                            const start = getPortPoint(sourceNode, edge.source.port);
                            const end = getPortPoint(targetNode, edge.target.port);

                            let pathData = '';
                            let centerPoint: CanvasPoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

                            if (edge.lineStyle === 'bezier') {
                                pathData = buildBezierPath(start, end, portNormal(edge.source.port), portNormal(edge.target.port));
                            } else if (edge.lineStyle === 'straight') {
                                pathData = pointsToPolylinePath([start, end]);
                            } else {
                                const points = buildOrthogonalPoints(edge, nodesById, localDoc.nodes);
                                pathData = pointsToPolylinePath(points);
                                if (points.length > 0) centerPoint = points[Math.floor(points.length / 2)];
                            }

                            const edgeSelected = selectedEdgeId === edge.id;
                            const edgeColor = edgeSelected ? '#2563eb' : (edge.stroke || '#64748b');
                            return (
                                <g key={edge.id}>
                                    <path
                                        d={pathData}
                                        stroke="transparent"
                                        strokeWidth={18 / zoom}
                                        fill="none"
                                        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setSelectedEdgeId(edge.id);
                                            setSelectedNodeIds([]);
                                        }}
                                        onDoubleClick={(event) => {
                                            if (readOnly) return;
                                            event.stopPropagation();
                                            setSelectedEdgeId(edge.id);
                                            setSelectedNodeIds([]);
                                            setEditorOpen(true);
                                        }}
                                    />
                                    <path
                                        d={pathData}
                                        stroke={edgeColor}
                                        strokeWidth={edgeSelected ? 3 : 2}
                                        strokeDasharray={edge.dashed ? '9 7' : undefined}
                                        fill="none"
                                        markerStart={edge.startArrow ? 'url(#arrow-start)' : undefined}
                                        markerEnd={edge.endArrow === false ? undefined : 'url(#arrow-end)'}
                                        style={{ pointerEvents: 'none' }}
                                    />

                                    {edge.text && (
                                        <text x={centerPoint.x + 6} y={centerPoint.y - 6} fontSize="12" fill="#334155" pointerEvents="none">
                                            {edge.text}
                                        </text>
                                    )}
                                </g>
                            );
                        })}

                        {edgeDragAnchor && edgeDragWorld && (
                            <line
                                x1={edgeDragAnchor.x}
                                y1={edgeDragAnchor.y}
                                x2={edgeDragWorld.x}
                                y2={edgeDragWorld.y}
                                stroke="#2563eb"
                                strokeWidth={2 / zoom}
                                strokeDasharray={`${6 / zoom} ${4 / zoom}`}
                                pointerEvents="none"
                            />
                        )}

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

                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        {visibleNodes.map((node) => {
                            const isSelected = selectedSet.has(node.id);
                            const isLinkSource = linkFrom?.nodeId === node.id;
                            const isInlineEditing = editingNodeId === node.id;

                            const baseStyle = getNodeBaseStyle(node);
                            const border = isLinkSource
                                ? '3px dashed #facc15'
                                : isSelected
                                    ? '2px solid rgba(37,99,235,0.9)'
                                    : node.style.stroke
                                        ? `2px solid ${node.style.stroke}`
                                        : (node.type === 'text' || node.type === 'icon' ? 'none' : '1px solid rgba(255,255,255,0.4)');
                            const textColor = nodeTextColor(node);

                            return (
                                <div
                                    key={node.id}
                                    onPointerDown={(event) => onNodeMouseDown(event, node)}
                                    onDoubleClick={(event) => {
                                        if (readOnly) return;
                                        event.stopPropagation();
                                        setSelectedNodeIds([node.id]);
                                        setSelectedEdgeId(null);
                                        if (node.type === 'icon') {
                                            // Icons have no inline text — re-pick instead.
                                            setIconPickerMode({ replaceNodeId: node.id });
                                        } else {
                                            setEditingNodeId(node.id);
                                            setEditingNodeContent(node.content);
                                        }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        pointerEvents: 'auto',
                                        left: node.position.x,
                                        top: node.position.y,
                                        width: node.size.width,
                                        height: node.size.height,
                                        border,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                        padding: 10,
                                        fontWeight: 700,
                                        color: textColor,
                                        userSelect: 'none',
                                        cursor: readOnly ? 'default' : (isInlineEditing ? 'text' : 'grab'),
                                        ...baseStyle
                                    }}
                                    title={readOnly ? 'Lectura' : 'Doble clic para editar'}
                                >
                                    {node.type === 'icon' ? (
                                        node.iconSvg ? (
                                            <div
                                                aria-hidden
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    color: node.style.fill,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                dangerouslySetInnerHTML={{ __html: node.iconSvg }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>Sin ícono</span>
                                        )
                                    ) : isInlineEditing ? (
                                        <textarea
                                            autoFocus
                                            value={editingNodeContent}
                                            onChange={(event) => setEditingNodeContent(event.target.value)}
                                            onBlur={finishInlineEdit}
                                            onKeyDown={(event) => {
                                                // Enter inserts a line break (default textarea
                                                // behaviour) so text can span several lines.
                                                // Commit with Cmd/Ctrl+Enter or by blurring.
                                                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                                    event.preventDefault();
                                                    finishInlineEdit();
                                                }
                                                if (event.key === 'Escape') {
                                                    event.preventDefault();
                                                    setEditingNodeId(null);
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                background: 'rgba(255,255,255,0.16)',
                                                border: '1px solid rgba(255,255,255,0.45)',
                                                borderRadius: 8,
                                                color: textColor,
                                                fontWeight: 700,
                                                textAlign: 'center',
                                                padding: 8,
                                                resize: 'none',
                                                lineHeight: 1.3,
                                                fontSize: fontPx(node)
                                            }}
                                        />
                                    ) : (
                                        <span style={{
                                            transform: node.type === 'diamond' ? 'scale(0.88)' : 'none',
                                            fontSize: fontPx(node),
                                            // Honour explicit line breaks and wrap long text
                                            // inside the node bounds.
                                            whiteSpace: 'pre-wrap',
                                            overflowWrap: 'break-word',
                                            wordBreak: 'break-word',
                                            lineHeight: 1.3,
                                            maxWidth: '100%'
                                        }}>{node.content}</span>
                                    )}
                                </div>
                            );
                        })}

                        {/* Branch collapse toggles */}
                        {visibleNodes.map((node) => {
                            if (!nodesWithChildren.has(node.id)) return null;
                            const size = 22 / zoom;
                            const cx = node.position.x + node.size.width / 2;
                            const cy = node.position.y + node.size.height;
                            return (
                                <button
                                    key={`collapse-${node.id}`}
                                    type="button"
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        toggleCollapse(node.id);
                                    }}
                                    title={node.collapsed ? 'Expandir rama' : 'Colapsar rama'}
                                    style={{
                                        position: 'absolute',
                                        pointerEvents: 'auto',
                                        left: cx - size / 2,
                                        top: cy - size / 2,
                                        width: size,
                                        height: size,
                                        borderRadius: '9999px',
                                        border: `${1.5 / zoom}px solid #2563eb`,
                                        background: node.collapsed ? '#2563eb' : '#fff',
                                        color: node.collapsed ? '#fff' : '#2563eb',
                                        fontSize: 14 / zoom,
                                        fontWeight: 800,
                                        lineHeight: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        padding: 0,
                                        zIndex: 4
                                    }}
                                >
                                    {node.collapsed ? '+' : '−'}
                                </button>
                            );
                        })}

                        {/* Collapsed comment bubbles — click to open the modal */}
                        {visibleNodes.map((node) => {
                            if (node.comment === undefined && node.commentImages === undefined) return null;
                            const size = 26 / zoom;
                            const left = node.position.x + node.size.width - size / 2;
                            const top = node.position.y - size / 2;
                            return (
                                <button
                                    key={`comment-chip-${node.id}`}
                                    type="button"
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openCommentModal(node, false);
                                    }}
                                    title={node.comment || 'Ver comentario'}
                                    style={{
                                        position: 'absolute',
                                        pointerEvents: 'auto',
                                        left,
                                        top,
                                        width: size,
                                        height: size,
                                        borderRadius: '9999px',
                                        border: `${1.5 / zoom}px solid #fde047`,
                                        background: '#fef9c3',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 13 / zoom,
                                        lineHeight: 1,
                                        padding: 0,
                                        boxShadow: '0 3px 8px rgba(0,0,0,0.22)',
                                        zIndex: 4
                                    }}
                                >
                                    💬
                                </button>
                            );
                        })}

                        {/* Draggable endpoints for the selected connector */}
                        {!readOnly && selectedEdge && selectedEdgeEndpoints && (['source', 'target'] as const).map((end) => {
                            const point = selectedEdgeEndpoints[end];
                            const size = 13 / zoom;
                            return (
                                <div
                                    key={`endpoint-${end}`}
                                    onPointerDown={(event) => onEdgeEndpointMouseDown(event, selectedEdge.id, end)}
                                    title="Arrastra para reconectar"
                                    style={{
                                        position: 'absolute',
                                        pointerEvents: 'auto',
                                        left: point.x - size / 2,
                                        top: point.y - size / 2,
                                        width: size,
                                        height: size,
                                        borderRadius: '9999px',
                                        background: '#fff',
                                        border: `${2.5 / zoom}px solid #2563eb`,
                                        cursor: 'grab',
                                        zIndex: 6
                                    }}
                                />
                            );
                        })}

                        {resizeTarget && !hiddenNodeIds.has(resizeTarget.id) && RESIZE_CORNERS.map(({ corner, cursor }) => {
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
                                    onPointerDown={(event) => onResizeHandleMouseDown(event, resizeTarget, corner)}
                                    style={{
                                        position: 'absolute',
                                        pointerEvents: 'auto',
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
                    onPointerDown={(event) => event.stopPropagation()}
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
                        onPointerDown={(event) => event.stopPropagation()}
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

                {!readOnly && isCompact && !panelOpen && (
                    <button
                        type="button"
                        onClick={() => setPanelOpen(true)}
                        style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            zIndex: 20,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '10px 14px',
                            borderRadius: 12,
                            border: '1px solid var(--border-dim)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main, #0f172a)',
                            boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 700
                        }}
                    >
                        <ShapesIcon size={16} /> Herramientas
                    </button>
                )}
            </div>

            {!readOnly && isCompact && panelOpen && (
                <div
                    onPointerDown={() => setPanelOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 940, background: 'rgba(15,23,42,0.45)' }}
                />
            )}
            {!readOnly && (
            <aside
                className="glass-panel"
                style={isCompact ? {
                    padding: 10,
                    border: '1px solid var(--border-dim)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 950,
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    borderRadius: '18px 18px 0 0',
                    boxShadow: '0 -12px 32px rgba(15,23,42,0.3)',
                    transform: panelOpen ? 'translateY(0)' : 'translateY(106%)',
                    transition: 'transform 0.26s ease',
                    paddingBottom: 'calc(14px + env(safe-area-inset-bottom))'
                } : {
                    padding: 10,
                    border: '1px solid var(--border-dim)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    minHeight: 0,
                    maxHeight: 'calc(100vh - 130px)',
                    overflowY: 'auto'
                }}
            >
                {isCompact && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-card)', padding: '2px 0 8px', borderBottom: '1px solid var(--border-dim)', zIndex: 2 }}>
                        <strong style={{ fontSize: 14 }}>Herramientas</strong>
                        <button type="button" onClick={() => setPanelOpen(false)} className="btn-primary" style={{ padding: '6px 16px', fontSize: 13 }}>Listo</button>
                    </div>
                )}
                <PanelSection title="Elementos">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        {NODE_TYPE_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => addTypeCentered(opt.value)}
                                    title={`Agregar: ${opt.label}`}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4,
                                        padding: '10px 4px',
                                        borderRadius: 10,
                                        border: '1px solid var(--border-dim)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-main, #0f172a)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Icon size={18} />
                                    <span style={{ fontSize: 9, lineHeight: 1.1, textAlign: 'center' }}>{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </PanelSection>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                        className="btn-ghost"
                        onClick={() => {
                            if (!selectedNode) return;
                            setLinkFrom({ nodeId: selectedNode.id, port: 'right', lineStyle: newConnectionStyle });
                        }}
                        disabled={!selectedNode}
                        style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                        <LinkIcon size={13} /> Conectar
                    </button>
                    <button
                        className="btn-ghost"
                        onClick={deleteSelection}
                        disabled={selectedNodeIds.length === 0 && !selectedEdge}
                        style={{ padding: '6px 10px', fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                        <TrashIcon size={13} /> Eliminar
                    </button>
                    <button className="btn-ghost" onClick={exportAsPng} style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <DownloadIcon size={13} /> PNG
                    </button>
                </div>

                {linkFrom && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 10px', borderRadius: 8, background: 'rgba(37,99,235,0.10)', border: '1px solid rgba(37,99,235,0.25)' }}>
                        Selecciona un nodo destino para crear la conexión ({newConnectionStyle}).
                    </div>
                )}

                <PanelSection title="Estilo de conexión nueva" defaultOpen={false}>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {CONNECTION_STYLE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setNewConnectionStyle(opt.value)}
                                style={{
                                    flex: 1,
                                    padding: '6px 4px',
                                    fontSize: 11,
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    border: newConnectionStyle === opt.value ? '1px solid #2563eb' : '1px solid var(--border-dim)',
                                    background: newConnectionStyle === opt.value ? 'rgba(37,99,235,0.12)' : 'var(--bg-card)',
                                    color: 'var(--text-main, #0f172a)',
                                    fontWeight: newConnectionStyle === opt.value ? 700 : 400
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </PanelSection>

                {selectedNodeIds.length > 1 && (
                    <PanelSection title={`${selectedNodeIds.length} nodos seleccionados`}>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Alinear los elementos seleccionados</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="btn-ghost" onClick={() => alignSelection('left')} style={miniBtn}>Izquierda</button>
                            <button type="button" className="btn-ghost" onClick={() => alignSelection('centerX')} style={miniBtn}>Centrar</button>
                            <button type="button" className="btn-ghost" onClick={() => alignSelection('right')} style={miniBtn}>Derecha</button>
                        </div>
                    </PanelSection>
                )}

                {selectedNode && (
                    <PanelSection title="Elemento seleccionado">
                        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                            {NODE_TYPE_OPTIONS.find((o) => o.value === selectedNode.type)?.label || 'Elemento'}
                        </div>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => setEditorOpen(true)}
                            style={{ padding: '9px 12px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                            <PencilIcon size={14} /> Editar elemento
                        </button>
                        <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => openCommentModal(selectedNode, true)}
                            style={{ padding: '6px 10px', fontSize: 12 }}
                        >
                            💬 {selectedNode.comment !== undefined || selectedNode.commentImages !== undefined ? 'Editar comentario' : 'Agregar comentario'}
                        </button>
                        {selectedNode.type === 'icon' && (
                            <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => setIconPickerMode({ replaceNodeId: selectedNode.id })}
                                style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <SmileIcon size={13} /> Cambiar ícono
                            </button>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Orden de capa</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="btn-ghost" onClick={() => reorderNode(selectedNode.id, 'front')} style={miniBtn}>Al frente</button>
                            <button type="button" className="btn-ghost" onClick={() => reorderNode(selectedNode.id, 'forward')} style={miniBtn}>Adelante</button>
                            <button type="button" className="btn-ghost" onClick={() => reorderNode(selectedNode.id, 'backward')} style={miniBtn}>Atrás</button>
                            <button type="button" className="btn-ghost" onClick={() => reorderNode(selectedNode.id, 'back')} style={miniBtn}>Al fondo</button>
                        </div>
                    </PanelSection>
                )}

                {selectedEdge && (
                    <PanelSection title="Conexión seleccionada">
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            Edita el tipo, color y puntos de conexión, o arrastra los puntos azules de los extremos en el lienzo.
                        </div>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => setEditorOpen(true)}
                            style={{ padding: '9px 12px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                            <PencilIcon size={14} /> Editar conexión
                        </button>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Orden de capa</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="btn-ghost" onClick={() => reorderEdge(selectedEdge.id, 'front')} style={miniBtn}>Al frente</button>
                            <button type="button" className="btn-ghost" onClick={() => reorderEdge(selectedEdge.id, 'forward')} style={miniBtn}>Adelante</button>
                            <button type="button" className="btn-ghost" onClick={() => reorderEdge(selectedEdge.id, 'backward')} style={miniBtn}>Atrás</button>
                            <button type="button" className="btn-ghost" onClick={() => reorderEdge(selectedEdge.id, 'back')} style={miniBtn}>Al fondo</button>
                        </div>
                    </PanelSection>
                )}

                {selectedNodeIds.length === 0 && !selectedEdge && (
                    <div style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.6 }}>
                        Haz clic en un elemento de la paleta para agregarlo. Selecciona un elemento o una conexión y pulsa Editar (o haz doble clic en una conexión). Cmd/Ctrl+Z deshace.
                    </div>
                )}
            </aside>
            )}

            {editorOpen && (selectedNode || selectedEdge) && (
                <div
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setEditorOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                >
                    <div
                        onClick={(event) => event.stopPropagation()}
                        style={{ width: 'min(600px, 100%)', maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg-card)', color: 'var(--text-main, #0f172a)', borderRadius: 14, border: '1px solid var(--border-dim)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-dim)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                            <strong style={{ fontSize: 14 }}>{selectedNode ? 'Editar elemento' : 'Editar conexión'}</strong>
                            <button type="button" onClick={() => setEditorOpen(false)} aria-label="Cerrar" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: 'var(--text-dim)' }}>✕</button>
                        </div>

                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {selectedNode && (
                                <>
                                    {selectedNode.type === 'icon' ? (
                                        <div>
                                            <label style={editorLabel}>Ícono</label>
                                            <button
                                                type="button"
                                                onClick={() => setIconPickerMode({ replaceNodeId: selectedNode.id })}
                                                className="btn-ghost"
                                                style={{ marginTop: 6, padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                                <SmileIcon size={14} /> Cambiar ícono
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <label style={editorLabel}>Texto</label>
                                            <textarea className="input-glass" value={selectedNode.content} onChange={(event) => updateNode(selectedNode.id, { content: event.target.value }, true)} rows={2} style={{ marginTop: 6 }} />
                                        </div>
                                    )}
                                    <div>
                                        <label style={editorLabel}>Tipo de elemento</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))', gap: 6, marginTop: 6 }}>
                                            {NODE_TYPE_OPTIONS.map((opt) => {
                                                const Icon = opt.icon;
                                                const active = selectedNode.type === opt.value;
                                                return (
                                                    <button key={opt.value} type="button" onClick={() => updateNode(selectedNode.id, { type: opt.value })}
                                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', border: active ? '1px solid #2563eb' : '1px solid var(--border-dim)', background: active ? 'rgba(37,99,235,0.12)' : 'var(--bg-card)', color: 'var(--text-main, #0f172a)' }}>
                                                        <Icon size={16} /><span style={{ fontSize: 9, textAlign: 'center' }}>{opt.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={editorLabel}>Tamaño de texto</label>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                            {FONT_SCALE_OPTIONS.map((opt) => {
                                                const active = (selectedNode.style.fontScale ?? 'md') === opt.value;
                                                return (
                                                    <button key={opt.value} type="button" onClick={() => updateNode(selectedNode.id, { style: { fontScale: opt.value } })}
                                                        style={{ flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: 'pointer', border: active ? '1px solid #2563eb' : '1px solid var(--border-dim)', background: active ? 'rgba(37,99,235,0.12)' : 'var(--bg-card)', color: 'var(--text-main, #0f172a)' }}>{opt.label}</button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={editorLabel}>Color de texto</label>
                                        <div style={swatchGrid}>
                                            {TEXT_COLORS.map((color) => (
                                                <button key={color} type="button" onClick={() => updateNode(selectedNode.id, { style: { textColor: color } }, true)} title={color} style={swatchStyle(selectedNode.style.textColor?.toLowerCase() === color.toLowerCase(), color)} />
                                            ))}
                                        </div>
                                    </div>
                                    {selectedNode.type !== 'text' && (
                                        <div>
                                            <label style={editorLabel}>Relleno</label>
                                            <div style={swatchGrid}>
                                                {CURATED_COLORS.map((color) => (
                                                    <button key={color} type="button" onClick={() => updateNode(selectedNode.id, { style: { fill: color } }, true)} title={color} style={swatchStyle(selectedNode.style.fill?.toLowerCase() === color.toLowerCase(), color)} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {selectedNode.type !== 'text' && (
                                        <div>
                                            <label style={editorLabel}>Color de borde</label>
                                            <div style={swatchGrid}>
                                                {CURATED_COLORS.map((color) => (
                                                    <button key={color} type="button" onClick={() => updateNode(selectedNode.id, { style: { stroke: color } }, true)} title={color} style={swatchStyle(selectedNode.style.stroke?.toLowerCase() === color.toLowerCase(), color)} />
                                                ))}
                                            </div>
                                            <button type="button" onClick={() => updateNode(selectedNode.id, { style: { stroke: undefined } })} style={{ marginTop: 6, padding: '5px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border-dim)', background: 'var(--bg-card)', color: 'var(--text-main, #0f172a)' }}>Sin borde</button>
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedEdge && (
                                <>
                                    <div>
                                        <label style={editorLabel}>Tipo de conector</label>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                            {CONNECTION_STYLE_OPTIONS.map((opt) => {
                                                const active = selectedEdge.lineStyle === opt.value;
                                                return (
                                                    <button key={opt.value} type="button" onClick={() => updateEdge(selectedEdge.id, { lineStyle: opt.value })}
                                                        style={{ flex: 1, padding: '9px 4px', fontSize: 13, borderRadius: 8, cursor: 'pointer', border: active ? '1px solid #2563eb' : '1px solid var(--border-dim)', background: active ? 'rgba(37,99,235,0.12)' : 'var(--bg-card)', color: 'var(--text-main, #0f172a)', fontWeight: active ? 700 : 400 }}>{opt.label}</button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={editorLabel}>Color de línea</label>
                                        <div style={swatchGrid}>
                                            {EDGE_COLORS.map((color) => {
                                                const isDefault = color === EDGE_COLORS[0];
                                                const active = selectedEdge.stroke ? selectedEdge.stroke.toLowerCase() === color.toLowerCase() : isDefault;
                                                return (
                                                    <button key={color} type="button" onClick={() => updateEdge(selectedEdge.id, { stroke: isDefault ? undefined : color })} title={color} style={swatchStyle(active, color)} />
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={editorLabel}>Puntos de conexión</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                                            {(['source', 'target'] as const).map((end) => (
                                                <div key={end}>
                                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{end === 'source' ? 'Origen' : 'Destino'}</div>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        {([['top', '↑'], ['right', '→'], ['bottom', '↓'], ['left', '←']] as const).map(([port, arrow]) => {
                                                            const active = selectedEdge[end].port === port;
                                                            return (
                                                                <button key={port} type="button" title={port}
                                                                    onClick={() => updateEdge(selectedEdge.id, { [end]: { nodeId: selectedEdge[end].nodeId, port } } as Partial<CanvasEdge>)}
                                                                    style={{ flex: 1, padding: '8px 0', fontSize: 15, borderRadius: 8, cursor: 'pointer', border: active ? '1px solid #2563eb' : '1px solid var(--border-dim)', background: active ? 'rgba(37,99,235,0.12)' : 'var(--bg-card)', color: 'var(--text-main, #0f172a)' }}>{arrow}</button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={editorLabel}>Texto de conexión</label>
                                        <input className="input-glass" value={selectedEdge.text || ''} onChange={(event) => updateEdge(selectedEdge.id, { text: event.target.value }, true)} placeholder="Ej: Sí / No" style={{ marginTop: 6 }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                            <input type="checkbox" checked={!!selectedEdge.dashed} onChange={(event) => updateEdge(selectedEdge.id, { dashed: event.target.checked || undefined })} /> Línea discontinua
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                            <input type="checkbox" checked={!!selectedEdge.startArrow} onChange={(event) => updateEdge(selectedEdge.id, { startArrow: event.target.checked })} /> Flecha al inicio
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                            <input type="checkbox" checked={selectedEdge.endArrow !== false} onChange={(event) => updateEdge(selectedEdge.id, { endArrow: event.target.checked })} /> Flecha al final
                                        </label>
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid var(--border-dim)', position: 'sticky', bottom: 0, background: 'var(--bg-card)' }}>
                            <button type="button" className="btn-primary" onClick={() => setEditorOpen(false)} style={{ padding: '8px 16px', fontSize: 13 }}>Listo</button>
                        </div>
                    </div>
                </div>
            )}

            {openCommentNodeId && (() => {
                const node = nodesById.get(openCommentNodeId);
                if (!node) return null;
                const hasContent = node.comment !== undefined || node.commentImages !== undefined;
                return (
                    <div
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => { if (!commentModalEditing) closeCommentModal(); }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1000,
                            background: 'rgba(15,23,42,0.55)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20
                        }}
                    >
                        <div
                            onClick={(event) => event.stopPropagation()}
                            style={{
                                width: 'min(480px, 100%)',
                                maxHeight: '82vh',
                                overflowY: 'auto',
                                background: 'var(--bg-card)',
                                color: 'var(--text-main, #0f172a)',
                                borderRadius: 14,
                                border: '1px solid var(--border-dim)',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border-dim)' }}>
                                <strong style={{ fontSize: 13 }}>💬 Comentario</strong>
                                <button
                                    type="button"
                                    onClick={closeCommentModal}
                                    aria-label="Cerrar"
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, lineHeight: 1, color: 'var(--text-dim)' }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {commentModalEditing ? (
                                    <>
                                        {editingCommentImages.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {editingCommentImages.map((img, i) => (
                                                    <div key={i} style={{ position: 'relative', width: 'calc(50% - 4px)' }}>
                                                        <img src={img} alt={`Imagen ${i + 1}`} style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingCommentImages((prev) => prev.filter((_, j) => j !== i))}
                                                            title="Quitar imagen"
                                                            style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '9999px', border: 'none', background: 'rgba(15,23,42,0.75)', color: '#fff', cursor: 'pointer' }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <textarea
                                            autoFocus
                                            value={editingCommentText}
                                            onChange={(event) => setEditingCommentText(event.target.value)}
                                            onPaste={onCommentPaste}
                                            placeholder="Escribe un comentario o pega una imagen…"
                                            style={{
                                                width: '100%',
                                                minHeight: 110,
                                                resize: 'vertical',
                                                borderRadius: 8,
                                                border: '1px solid var(--border-dim)',
                                                padding: 8,
                                                fontSize: 13,
                                                fontFamily: 'inherit',
                                                background: 'var(--bg-card)',
                                                color: 'var(--text-main, #0f172a)',
                                                outline: 'none'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => commentFileInputRef.current?.click()}
                                            disabled={editingCommentImages.length >= MAX_COMMENT_IMAGES}
                                            style={{ alignSelf: 'flex-start', padding: '6px 10px', fontSize: 12, borderRadius: 8, cursor: editingCommentImages.length >= MAX_COMMENT_IMAGES ? 'not-allowed' : 'pointer', border: '1px solid var(--border-dim)', background: 'var(--bg-card)', color: 'var(--text-main, #0f172a)', opacity: editingCommentImages.length >= MAX_COMMENT_IMAGES ? 0.5 : 1 }}
                                        >
                                            📎 Adjuntar imagen ({editingCommentImages.length}/{MAX_COMMENT_IMAGES})
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {node.commentImages && node.commentImages.length > 0 && (() => {
                                            const imgs = node.commentImages;
                                            const idx = Math.min(commentSlide, imgs.length - 1);
                                            return (
                                                <div style={{ position: 'relative' }}>
                                                    <img
                                                        src={imgs[idx]}
                                                        alt={`Comentario ${idx + 1}`}
                                                        onClick={() => setLightbox({ images: imgs, index: idx })}
                                                        title="Ampliar imagen"
                                                        style={{ width: '100%', borderRadius: 8, display: 'block', cursor: 'zoom-in' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setLightbox({ images: imgs, index: idx })}
                                                        title="Ver en pantalla completa"
                                                        aria-label="Ver imagen en pantalla completa"
                                                        style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(15,23,42,0.75)', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        ⛶
                                                    </button>
                                                    {imgs.length > 1 && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => setCommentSlide((idx - 1 + imgs.length) % imgs.length)}
                                                                aria-label="Imagen anterior"
                                                                style={{ position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '9999px', border: 'none', background: 'rgba(15,23,42,0.65)', color: '#fff', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                                                            >
                                                                ‹
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setCommentSlide((idx + 1) % imgs.length)}
                                                                aria-label="Imagen siguiente"
                                                                style={{ position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '9999px', border: 'none', background: 'rgba(15,23,42,0.65)', color: '#fff', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                                                            >
                                                                ›
                                                            </button>
                                                            <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(15,23,42,0.6)', padding: '4px 8px', borderRadius: 999 }}>
                                                                {imgs.map((_, i) => (
                                                                    <span
                                                                        key={i}
                                                                        onClick={() => setCommentSlide(i)}
                                                                        style={{ width: 7, height: 7, borderRadius: '9999px', cursor: 'pointer', background: i === idx ? '#fff' : 'rgba(255,255,255,0.45)' }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        {node.comment && <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.5 }}>{node.comment}</div>}
                                        {!hasContent && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Sin contenido.</div>}
                                    </>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 14px', borderTop: '1px solid var(--border-dim)' }}>
                                {commentModalEditing ? (
                                    <>
                                        <button type="button" className="btn-ghost" onClick={cancelCommentModal} style={{ padding: '6px 12px', fontSize: 12 }}>Cancelar</button>
                                        <button type="button" className="btn-primary" onClick={saveCommentModal} style={{ padding: '6px 12px', fontSize: 12 }}>Guardar</button>
                                    </>
                                ) : (
                                    <>
                                        {!readOnly && <button type="button" className="btn-ghost" onClick={beginCommentEditingInModal} style={{ padding: '6px 12px', fontSize: 12 }}>Editar</button>}
                                        <button type="button" className="btn-primary" onClick={closeCommentModal} style={{ padding: '6px 12px', fontSize: 12 }}>Cerrar</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {lightbox && (() => {
                const imgs = lightbox.images;
                const i = lightbox.index;
                return (
                    <div
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => setLightbox(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1100,
                            background: 'rgba(2,6,23,0.92)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 24,
                            cursor: 'zoom-out'
                        }}
                    >
                        <img
                            src={imgs[i]}
                            alt={`Comentario ${i + 1}`}
                            onClick={(event) => event.stopPropagation()}
                            style={{ maxWidth: '96vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 24px 60px rgba(0,0,0,0.55)' }}
                        />
                        {imgs.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={(event) => { event.stopPropagation(); setLightbox({ images: imgs, index: (i - 1 + imgs.length) % imgs.length }); }}
                                    aria-label="Imagen anterior"
                                    style={{ position: 'fixed', top: '50%', left: 24, transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '9999px', border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer', fontSize: 26, lineHeight: 1 }}
                                >
                                    ‹
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => { event.stopPropagation(); setLightbox({ images: imgs, index: (i + 1) % imgs.length }); }}
                                    aria-label="Imagen siguiente"
                                    style={{ position: 'fixed', top: '50%', right: 24, transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '9999px', border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer', fontSize: 26, lineHeight: 1 }}
                                >
                                    ›
                                </button>
                                <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 13, background: 'rgba(255,255,255,0.14)', padding: '5px 12px', borderRadius: 999 }}>
                                    {i + 1} / {imgs.length}
                                </div>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={() => setLightbox(null)}
                            aria-label="Cerrar"
                            style={{ position: 'fixed', top: 18, right: 22, width: 40, height: 40, borderRadius: '9999px', border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
                        >
                            ✕
                        </button>
                    </div>
                );
            })()}

            {iconPickerMode && !readOnly && (
                <Suspense fallback={null}>
                    <IconPicker
                        onClose={() => setIconPickerMode(null)}
                        onPick={(svg) => {
                            if (iconPickerMode === 'insert') {
                                insertIconCentered(svg);
                            } else if (iconPickerMode) {
                                replaceNodeIcon(iconPickerMode.replaceNodeId, svg);
                            }
                            setIconPickerMode(null);
                        }}
                    />
                </Suspense>
            )}
        </div>
    );
}
