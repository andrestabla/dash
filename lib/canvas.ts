export type DashboardKind = 'kanban' | 'canvas';

export type CanvasNodeType =
    | 'rectangle'
    | 'circle'
    | 'diamond'
    | 'pill'
    | 'cylinder'
    | 'document'
    | 'parallelogram'
    | 'sticky'
    | 'frame';
export type CanvasPort = 'top' | 'right' | 'bottom' | 'left';
export type CanvasLineStyle = 'orthogonal' | 'straight' | 'bezier';
export type CanvasFontScale = 'sm' | 'md' | 'lg' | 'xl';

export interface CanvasPoint {
    x: number;
    y: number;
}

export interface CanvasSize {
    width: number;
    height: number;
}

export interface CanvasNodeStyle {
    fill: string;
    radius: number;
    stroke?: string;
    fontScale?: CanvasFontScale;
}

export interface CanvasNode {
    id: string;
    type: CanvasNodeType;
    position: CanvasPoint;
    size: CanvasSize;
    style: CanvasNodeStyle;
    content: string;
    comment?: string;
    // When true, the node's downstream branch is hidden on the canvas.
    collapsed?: boolean;
}

export interface CanvasConnectorEndpoint {
    nodeId: string;
    port: CanvasPort;
}

export interface CanvasEdge {
    id: string;
    type: 'connector';
    source: CanvasConnectorEndpoint;
    target: CanvasConnectorEndpoint;
    lineStyle: CanvasLineStyle;
    text?: string;
    comment?: string;
    startArrow?: boolean;
    endArrow?: boolean;
}

export interface CanvasDocument {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    updatedAt?: string;
}

export interface CanvasRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 88;

function asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') return {};
    return value as Record<string, unknown>;
}

function asNumber(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value : fallback;
}

function asPort(value: unknown, fallback: CanvasPort = 'right'): CanvasPort {
    if (value === 'top' || value === 'right' || value === 'bottom' || value === 'left') return value;
    return fallback;
}

function asFontScale(value: unknown): CanvasFontScale {
    if (value === 'sm' || value === 'md' || value === 'lg' || value === 'xl') return value;
    return 'md';
}

function asNodeType(value: unknown): CanvasNodeType {
    if (
        value === 'rectangle' ||
        value === 'circle' ||
        value === 'diamond' ||
        value === 'pill' ||
        value === 'cylinder' ||
        value === 'document' ||
        value === 'parallelogram' ||
        value === 'sticky' ||
        value === 'frame'
    ) return value;
    return 'rectangle';
}

function inferPortByDelta(from: CanvasNode, to: CanvasNode): CanvasPort {
    const dx = to.position.x - from.position.x;
    const dy = to.position.y - from.position.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
        return dx >= 0 ? 'right' : 'left';
    }
    return dy >= 0 ? 'bottom' : 'top';
}

export function getNodeRect(node: CanvasNode): CanvasRect {
    return {
        x: node.position.x,
        y: node.position.y,
        width: node.size.width,
        height: node.size.height
    };
}

export function getNodeCenter(node: CanvasNode): CanvasPoint {
    return {
        x: node.position.x + node.size.width / 2,
        y: node.position.y + node.size.height / 2
    };
}

export function getPortPoint(node: CanvasNode, port: CanvasPort): CanvasPoint {
    const x = node.position.x;
    const y = node.position.y;
    const w = node.size.width;
    const h = node.size.height;

    if (port === 'top') return { x: x + w / 2, y };
    if (port === 'right') return { x: x + w, y: y + h / 2 };
    if (port === 'bottom') return { x: x + w / 2, y: y + h };
    return { x, y: y + h / 2 };
}

export function getNearestPort(node: CanvasNode, p: CanvasPoint): CanvasPort {
    const center = getNodeCenter(node);
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'bottom' : 'top';
}

export function createDefaultCanvasDocument(title = 'Idea Principal'): CanvasDocument {
    const rootId = `node_${Math.random().toString(36).slice(2, 8)}`;
    const childId = `node_${Math.random().toString(36).slice(2, 8)}`;

    return {
        nodes: [
            {
                id: rootId,
                type: 'rectangle',
                position: { x: 120, y: 120 },
                size: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
                style: { fill: '#3b82f6', radius: 10 },
                content: title
            },
            {
                id: childId,
                type: 'rectangle',
                position: { x: 420, y: 240 },
                size: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
                style: { fill: '#10b981', radius: 10 },
                content: 'Siguiente paso'
            }
        ],
        edges: [{
            id: `edge_${Math.random().toString(36).slice(2, 8)}`,
            type: 'connector',
            source: { nodeId: rootId, port: 'right' },
            target: { nodeId: childId, port: 'left' },
            lineStyle: 'orthogonal'
        }],
        updatedAt: new Date().toISOString()
    };
}

export function getDashboardKind(settings: unknown): DashboardKind {
    const record = asRecord(settings);
    return record.dashboardType === 'canvas' ? 'canvas' : 'kanban';
}

function normalizeNode(inputNode: unknown): CanvasNode {
    const node = asRecord(inputNode);
    const legacyX = asNumber(node.x, 120);
    const legacyY = asNumber(node.y, 120);
    const legacyW = asNumber(node.width, DEFAULT_NODE_WIDTH);
    const legacyH = asNumber(node.height, DEFAULT_NODE_HEIGHT);
    const legacyText = asString(node.text, 'Nodo');
    const legacyColor = asString(node.color, '#3b82f6');

    const position = asRecord(node.position);
    const size = asRecord(node.size);
    const style = asRecord(node.style);

    return {
        id: asString(node.id, `node_${Math.random().toString(36).slice(2, 8)}`),
        type: asNodeType(node.type),
        position: {
            x: asNumber(position.x, legacyX),
            y: asNumber(position.y, legacyY)
        },
        size: {
            width: asNumber(size.width, legacyW),
            height: asNumber(size.height, legacyH)
        },
        style: {
            fill: asString(style.fill, legacyColor),
            radius: asNumber(style.radius, 10),
            stroke: typeof style.stroke === 'string' ? style.stroke : undefined,
            fontScale: asFontScale(style.fontScale)
        },
        content: asString(node.content, legacyText),
        comment: typeof node.comment === 'string' ? node.comment : undefined,
        collapsed: node.collapsed === true ? true : undefined
    };
}

function normalizeEdge(inputEdge: unknown, nodesById: Map<string, CanvasNode>): CanvasEdge | null {
    const edge = asRecord(inputEdge);
    const source = asRecord(edge.source);
    const target = asRecord(edge.target);

    const legacyFrom = asString(edge.from, '');
    const legacyTo = asString(edge.to, '');

    const sourceNodeId = asString(source.nodeId, legacyFrom);
    const targetNodeId = asString(target.nodeId, legacyTo);

    const sourceNode = nodesById.get(sourceNodeId);
    const targetNode = nodesById.get(targetNodeId);
    if (!sourceNode || !targetNode) return null;

    return {
        id: asString(edge.id, `edge_${Math.random().toString(36).slice(2, 8)}`),
        type: 'connector',
        source: {
            nodeId: sourceNodeId,
            port: asPort(source.port, inferPortByDelta(sourceNode, targetNode))
        },
        target: {
            nodeId: targetNodeId,
            port: asPort(target.port, inferPortByDelta(targetNode, sourceNode))
        },
        lineStyle: edge.lineStyle === 'straight' || edge.lineStyle === 'bezier' || edge.lineStyle === 'orthogonal'
            ? edge.lineStyle
            : 'orthogonal',
        text: typeof edge.text === 'string' ? edge.text : (typeof edge.label === 'string' ? edge.label : undefined),
        comment: typeof edge.comment === 'string' ? edge.comment : undefined,
        startArrow: typeof edge.startArrow === 'boolean' ? edge.startArrow : false,
        endArrow: typeof edge.endArrow === 'boolean' ? edge.endArrow : true
    };
}

export function normalizeCanvasDocument(input: unknown, fallbackTitle = 'Idea Principal'): CanvasDocument {
    const fallback = createDefaultCanvasDocument(fallbackTitle);
    if (!input || typeof input !== 'object') return fallback;

    const record = asRecord(input);
    const rawNodes = Array.isArray(record.nodes) ? record.nodes : [];
    const nodes = rawNodes.map(normalizeNode).filter((node) => Boolean(node.id));

    if (nodes.length === 0) return fallback;

    const nodesById = new Map(nodes.map((node) => [node.id, node] as const));
    const rawEdges = Array.isArray(record.edges) ? record.edges : [];
    const edges = rawEdges
        .map((edge) => normalizeEdge(edge, nodesById))
        .filter((edge): edge is CanvasEdge => Boolean(edge));

    return {
        nodes,
        edges,
        updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString()
    };
}

export function buildCanvasSettings(baseSettings: Record<string, unknown>, nameHint: string): Record<string, unknown> {
    const kind = getDashboardKind(baseSettings);
    const canvas = normalizeCanvasDocument(baseSettings?.canvas, nameHint);

    if (kind === 'canvas') {
        return {
            ...baseSettings,
            dashboardType: 'canvas',
            canvas
        };
    }

    return {
        ...baseSettings,
        dashboardType: 'kanban'
    };
}
