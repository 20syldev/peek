import type { Element, ElementContent, Root, Text } from "hast";
import { SKIP, visit } from "unist-util-visit";

export type AlertKind = "note" | "tip" | "important" | "warning" | "caution";

// GitHub accepts the bare marker, GitLab adds a title, Obsidian adds aliases and folding
export type AlertMode = "github" | "gitlab" | "obsidian";

export type AlertLabels = Record<AlertKind, string>;

const GITHUB_KINDS = new Set<string>(["note", "tip", "important", "warning", "caution"]);

// GitHub alert types, plus the Obsidian callout names folded onto the closest one
const KINDS: Record<string, AlertKind> = {
    note: "note",
    info: "note",
    todo: "note",
    abstract: "note",
    summary: "note",
    tldr: "note",
    question: "note",
    help: "note",
    faq: "note",
    example: "note",
    quote: "note",
    cite: "note",
    tip: "tip",
    hint: "tip",
    success: "tip",
    check: "tip",
    done: "tip",
    important: "important",
    warning: "warning",
    attention: "warning",
    caution: "caution",
    danger: "caution",
    error: "caution",
    bug: "caution",
    failure: "caution",
    fail: "caution",
    missing: "caution",
};

// "[!TYPE]" and an optional fold sign (Obsidian); the title is whatever follows on the line
const MARKER = /^\s*\[!([\w-]+)\]([+-]?)[ \t]*/i;

/**
 * Merges the run of text nodes at the start of a paragraph, since the parser
 * may split "[!NOTE]" into several adjacent text nodes.
 *
 * @param paragraph - First paragraph of a blockquote, mutated in place
 * @returns The merged leading text node, or undefined when the paragraph starts with an element
 */
function leadingText(paragraph: Element): Text | undefined {
    const children = paragraph.children;
    const first = children[0];
    if (first?.type !== "text") return undefined;

    while (children[1]?.type === "text") {
        first.value += (children[1] as Text).value;
        children.splice(1, 1);
    }
    return first;
}

/**
 * Splits the first paragraph of a callout at its first line break: what
 * comes before is the title (inline formatting included), the rest is body.
 *
 * @param nodes - Paragraph content with the marker already removed
 * @returns The title nodes and the body nodes, either possibly empty
 */
function splitTitle(nodes: ElementContent[]): { title: ElementContent[]; body: ElementContent[] } {
    const title: ElementContent[] = [];
    const body: ElementContent[] = [];
    let inBody = false;

    for (const node of nodes) {
        if (inBody) {
            body.push(node);
            continue;
        }
        // A hard break after the marker ends the title line like a newline does
        if (node.type === "element" && node.tagName === "br") {
            inBody = true;
            continue;
        }
        const at = node.type === "text" ? node.value.indexOf("\n") : -1;
        if (node.type !== "text" || at === -1) {
            title.push(node);
            continue;
        }
        const head = node.value.slice(0, at).trimEnd();
        if (head) title.push({ type: "text", value: head });
        body.push({ type: "text", value: node.value.slice(at + 1) });
        inBody = true;
    }
    return { title, body };
}

/**
 * Tells whether title or body nodes carry no visible content.
 *
 * @param nodes - Nodes from splitTitle
 * @returns True when there are only whitespace text nodes, or none
 */
function isBlank(nodes: ElementContent[]): boolean {
    return nodes.every((node) => node.type === "text" && node.value.trim() === "");
}

/**
 * Converts a blockquote that opens with an alert marker into an alert block:
 * a container carrying the kind, whose first child is the title element.
 *
 * @param quote - Blockquote element to inspect
 * @param mode - Syntax of the flavor: GitHub takes the bare marker of its five
 *   types, GitLab also a title, Obsidian also aliases and folding
 * @param labels - Default title of each alert kind
 * @returns The alert element, or undefined when the blockquote is a plain quote
 */
function toAlert(quote: Element, mode: AlertMode, labels: AlertLabels): Element | undefined {
    const blocks = quote.children.filter(
        (child): child is ElementContent => !(child.type === "text" && child.value.trim() === ""),
    );
    const paragraph = blocks[0];
    if (paragraph?.type !== "element" || paragraph.tagName !== "p") return undefined;

    const text = leadingText(paragraph);
    const match = text && MARKER.exec(text.value);
    if (!text || !match) return undefined;

    const name = match[1].toLowerCase();
    const known = Object.hasOwn(KINDS, name);
    const fold = match[2];
    if (mode !== "obsidian" && (!GITHUB_KINDS.has(name) || fold)) return undefined;
    // Obsidian renders any unknown callout name as a plain note
    const kind: AlertKind = known ? KINDS[name] : "note";

    const rest: ElementContent[] = [
        { type: "text", value: text.value.slice(match[0].length) },
        ...paragraph.children.slice(1),
    ];
    const { title, body } = splitTitle(rest);
    const custom = !isBlank(title);
    if (mode === "github" && custom) return undefined;

    const heading: Element = {
        type: "element",
        tagName: fold ? "summary" : "p",
        properties: { dataAlertTitle: "", dataAlert: kind, dataAlertCustom: custom || undefined },
        children: custom ? title : [{ type: "text", value: labels[kind] }],
    };
    const lead: ElementContent[] = isBlank(body) ? [] : [{ ...paragraph, children: body }];

    return {
        type: "element",
        tagName: fold ? "details" : "div",
        properties: { dataAlert: kind, open: fold === "+" || undefined },
        children: [heading, ...lead, ...blocks.slice(1)],
    };
}

/**
 * Rehype plugin rendering GitHub and GitLab alerts ("> [!NOTE]") and Obsidian
 * callouts. It runs after sanitization, so the data attributes it adds are trusted.
 *
 * @param options - Alert syntax of the flavor and the default title of each kind
 * @returns The tree transformer
 */
export function rehypeAlerts(options: { mode: AlertMode; labels: AlertLabels }) {
    return (tree: Root) => {
        visit(tree, "element", (node, index, parent) => {
            if (node.tagName !== "blockquote" || !parent || index === undefined) return;
            const alert = toAlert(node, options.mode, options.labels);
            if (!alert) return;
            parent.children[index] = alert;
            // Skip the detached quote and visit the replacement, so nested alerts convert too
            return [SKIP, index];
        });
    };
}
