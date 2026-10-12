import type { ElementContent, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toString } from "hast-util-to-string";
import katex from "katex";
import { SKIP, visitParents } from "unist-util-visit-parents";

/**
 * Tells whether a class list marks math, and in which mode.
 *
 * @param classes - className property of an element, possibly missing or not a list
 * @returns "display", "inline", "math" (```math fence, mode decided by the parent) or null
 */
function mathKind(classes: unknown): "display" | "inline" | "math" | null {
    if (!Array.isArray(classes)) return null;
    if (classes.includes("math-display")) return "display";
    if (classes.includes("math-inline")) return "inline";
    if (classes.includes("language-math")) return "math";
    return null;
}

/**
 * Rehype plugin rendering the math of remark-math and ```math fences with
 * KaTeX. Unlike rehype-katex, it parses the KaTeX output with parse5 only,
 * never with DOMParser, so it runs inside the rendering worker. Invalid
 * formulas render as KaTeX error text instead of throwing.
 *
 * @returns The tree transformer
 */
export function rehypeMath() {
    return (tree: Root) => {
        visitParents(tree, "element", (node, ancestors) => {
            const kind = mathKind(node.properties.className);
            if (!kind) return;

            let parent = ancestors[ancestors.length - 1];
            let target: ElementContent = node;
            let display = kind === "display";

            // A fenced block replaces its whole pre and always renders in display mode
            const grandparent = ancestors[ancestors.length - 2];
            if (node.tagName === "code" && parent?.type === "element" && parent.tagName === "pre") {
                if (!grandparent) return;
                target = parent;
                parent = grandparent;
                display = true;
            }
            if (!parent) return;

            const html = katex.renderToString(toString(node), {
                displayMode: display,
                throwOnError: false,
                errorColor: "var(--destructive)",
                strict: false,
            });
            const nodes = fromHtml(html, { fragment: true }).children as ElementContent[];
            const index = parent.children.indexOf(target);
            // Already replaced with its fenced block: a second math code inside the same pre
            if (index === -1) return SKIP;
            parent.children.splice(index, 1, ...nodes);
            return SKIP;
        });
    };
}
