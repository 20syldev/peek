import type { Nodes, PhrasingContent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

export type TextBuilder = (match: RegExpExecArray) => PhrasingContent[] | null;

/**
 * Joins adjacent text siblings everywhere in the tree. The parser can split a
 * literal like "[[Page]]" into several text nodes, which would hide it from
 * a regular expression.
 *
 * @param tree - Markdown tree, mutated in place
 */
function mergeText(tree: Root) {
    visit(tree, (node: Nodes) => {
        if (!("children" in node)) return;
        const children = node.children as Nodes[];
        for (let index = children.length - 1; index > 0; index--) {
            const current = children[index];
            const previous = children[index - 1];
            if (current.type === "text" && previous.type === "text") {
                previous.value += current.value;
                children.splice(index, 1);
            }
        }
    });
}

/**
 * Rewrites inline syntax that micromark leaves as plain text: each match of
 * the pattern in a text node is replaced by the nodes the builder returns.
 * Code spans and code blocks are never touched since they are not text nodes.
 *
 * @param tree - Markdown tree, mutated in place
 * @param pattern - Global regular expression matched against each text node
 * @param build - Returns the replacement nodes for a match, or null to keep it literal
 */
export function replaceText(tree: Root, pattern: RegExp, build: TextBuilder) {
    mergeText(tree);
    visit(tree, "text", (node: Text, index, parent) => {
        if (!parent || index === undefined) return;

        const parts: PhrasingContent[] = [];
        let cursor = 0;
        pattern.lastIndex = 0;
        for (let match = pattern.exec(node.value); match; match = pattern.exec(node.value)) {
            const nodes = build(match);
            if (!nodes) continue;
            if (match.index > cursor) {
                parts.push({ type: "text", value: node.value.slice(cursor, match.index) });
            }
            parts.push(...nodes);
            cursor = match.index + match[0].length;
        }
        if (parts.length === 0) return;
        if (cursor < node.value.length) {
            parts.push({ type: "text", value: node.value.slice(cursor) });
        }

        // concat, not splice(...parts): a hostile paragraph can yield more nodes than the argument limit
        parent.children = parent.children
            .slice(0, index)
            .concat(parts, parent.children.slice(index + 1));
        return index + parts.length;
    });
}

/**
 * Wraps text in a phrasing node that renders as the given HTML element.
 * Emphasis is used as the carrier because mdast has no generic inline node.
 *
 * @param tagName - Element to render, e.g. "mark" or "ins"
 * @param value - Literal text placed inside the element, not parsed as Markdown
 * @returns An emphasis node whose hName makes remark-rehype emit the given tag
 */
export function inlineElement(tagName: string, value: string): PhrasingContent {
    return { type: "emphasis", data: { hName: tagName }, children: [{ type: "text", value }] };
}
