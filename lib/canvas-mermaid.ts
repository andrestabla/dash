// Mermaid-flowchart-subset parser. Translates a small slice of the Mermaid
// flowchart DSL (`flowchart LR`, `A[label] --> B(label) -.->|when X| C{label}`,
// etc.) into a layout-ready set of CanvasNodes / CanvasEdges. We deliberately
// support only the common shapes and edge styles that map cleanly to our
// canvas model — not the full Mermaid grammar.

import type { CanvasNodeType } from "./canvas";

export type FlowDirection = "LR" | "TB" | "RL" | "BT";

export interface ParsedNode {
    id: string;
    label: string;
    type: CanvasNodeType;
}

export interface ParsedEdge {
    from: string;
    to: string;
    label?: string;
    dashed: boolean;
    arrow: boolean; // false for `---` (line without arrowhead)
}

export interface ParsedFlow {
    direction: FlowDirection;
    nodes: ParsedNode[];
    edges: ParsedEdge[];
}

// Matches the various edge operators Mermaid supports. The character class is
// kept loose on purpose so casual whitespace ("A-->B" vs "A --> B") works.
// Match groups: 1 = operator text (e.g. "-->" / "-.->" / "==>" / "---")
const EDGE_OP = /\s*(-\.->|==>|-->|---+|===+)\s*/;

// Strict edge regex with an optional `|label|` segment in the middle.
const EDGE_PATTERN = /(-\.->|==>|-->|---+|===+)(?:\|([^|]*)\|)?/g;

interface NodeShapeMatch {
    type: CanvasNodeType;
    label: string;
}

function unescapeLabel(raw: string): string {
    return raw
        .replace(/\\n/g, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .trim();
}

// Detects whether a token holds a shape declaration (e.g. `A[label]`) and, if
// so, returns the shape + label. A bare identifier (`A`) returns null — the
// caller treats that as a reference to a previously-defined node.
function parseNodeToken(token: string): { id: string; shape: NodeShapeMatch | null } | null {
    const trimmed = token.trim();
    if (!trimmed) return null;
    // Most specific shapes first so e.g. `[[label]]` is not mis-parsed as `[label]`.
    const patterns: Array<{ open: string; close: string; type: CanvasNodeType }> = [
        { open: "((", close: "))", type: "circle" },
        { open: "[[", close: "]]", type: "rectangle" },
        { open: "([", close: "])", type: "pill" },
        { open: "[/", close: "/]", type: "parallelogram" },
        { open: "[(", close: ")]", type: "cylinder" },
        { open: "[", close: "]", type: "rectangle" },
        { open: "(", close: ")", type: "pill" },
        { open: "{", close: "}", type: "diamond" }
    ];
    for (const p of patterns) {
        const start = trimmed.indexOf(p.open);
        if (start < 0) continue;
        const end = trimmed.lastIndexOf(p.close);
        if (end <= start + p.open.length - 1) continue;
        const id = trimmed.slice(0, start).trim();
        if (!/^[A-Za-z_][\w-]*$/.test(id)) continue;
        const inner = trimmed.slice(start + p.open.length, end);
        return { id, shape: { type: p.type, label: unescapeLabel(inner) } };
    }
    // Bare reference.
    if (/^[A-Za-z_][\w-]*$/.test(trimmed)) {
        return { id: trimmed, shape: null };
    }
    return null;
}

function classifyEdge(op: string): { dashed: boolean; arrow: boolean } {
    if (op.startsWith("-.")) return { dashed: true, arrow: op.endsWith(">") };
    if (op.startsWith("==")) return { dashed: false, arrow: op.endsWith(">") };
    return { dashed: false, arrow: op.endsWith(">") };
}

// Splits a single flowchart line into alternating node tokens and edge ops.
function splitLine(line: string): { tokens: string[]; ops: string[] } {
    const ops: string[] = [];
    const opMatches: Array<{ index: number; length: number; raw: string }> = [];
    EDGE_PATTERN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EDGE_PATTERN.exec(line)) !== null) {
        opMatches.push({ index: m.index, length: m[0].length, raw: m[0] });
    }
    const tokens: string[] = [];
    let cursor = 0;
    for (const op of opMatches) {
        tokens.push(line.slice(cursor, op.index));
        ops.push(op.raw);
        cursor = op.index + op.length;
    }
    tokens.push(line.slice(cursor));
    return { tokens, ops };
}

export function parseMermaidFlowchart(source: string): ParsedFlow {
    const nodesById = new Map<string, ParsedNode>();
    const edges: ParsedEdge[] = [];
    let direction: FlowDirection = "TB";

    const rawLines = source.split(/\r?\n/);
    for (const rawLine of rawLines) {
        const line = rawLine.replace(/\s*%%.*$/, "").trim();
        if (!line) continue;

        const dirMatch = line.match(/^(?:flowchart|graph)\s+(LR|TB|TD|RL|BT)\s*$/i);
        if (dirMatch) {
            const code = dirMatch[1].toUpperCase();
            direction = (code === "TD" ? "TB" : code) as FlowDirection;
            continue;
        }

        // Ignore other directives (`classDef`, `style`, `subgraph`, etc.) for now.
        if (/^(classDef|class|style|linkStyle|subgraph|end|click)\b/i.test(line)) continue;

        if (!EDGE_OP.test(line) && !/\[|\(|\{/.test(line)) continue;

        const { tokens, ops } = splitLine(line);

        if (tokens.length === 1 && ops.length === 0) {
            // Standalone node declaration: `A[label]`.
            const parsed = parseNodeToken(tokens[0]);
            if (parsed && parsed.shape) {
                if (!nodesById.has(parsed.id)) {
                    nodesById.set(parsed.id, { id: parsed.id, label: parsed.shape.label, type: parsed.shape.type });
                }
            }
            continue;
        }

        // Multi-segment edge chain: `A[...] --> B(...) -->|label| C{...}`.
        const parsedTokens = tokens.map(parseNodeToken);
        for (let i = 0; i < ops.length; i += 1) {
            const left = parsedTokens[i];
            const right = parsedTokens[i + 1];
            if (!left || !right) continue;

            for (const t of [left, right]) {
                if (t.shape && !nodesById.has(t.id)) {
                    nodesById.set(t.id, { id: t.id, label: t.shape.label, type: t.shape.type });
                } else if (!t.shape && !nodesById.has(t.id)) {
                    nodesById.set(t.id, { id: t.id, label: t.id, type: "rectangle" });
                }
            }

            const opRaw = ops[i];
            const opOnly = opRaw.match(/(-\.->|==>|-->|---+|===+)/);
            const labelMatch = opRaw.match(/\|([^|]*)\|/);
            const op = opOnly ? opOnly[0] : "-->";
            const { dashed, arrow } = classifyEdge(op);
            edges.push({
                from: left.id,
                to: right.id,
                label: labelMatch ? unescapeLabel(labelMatch[1]) : undefined,
                dashed,
                arrow
            });
        }
    }

    return {
        direction,
        nodes: Array.from(nodesById.values()),
        edges
    };
}
