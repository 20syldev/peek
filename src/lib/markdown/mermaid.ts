import type { Element, Root } from "hast";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";

/**
 * Rehype plugin turning ```mermaid code blocks into figure placeholders that
 * carry the diagram source; the Mermaid component renders them client-side.
 * It must run before syntax highlighting so the source stays plain text.
 *
 * @returns The tree transformer
 */
export function rehypeMermaid() {
    return (tree: Root) => {
        visit(tree, "element", (node: Element, index, parent) => {
            if (node.tagName !== "pre" || !parent || index === undefined) return;
            const code = node.children.find(
                (child): child is Element => child.type === "element" && child.tagName === "code",
            );
            const classes = code?.properties.className;
            if (!code || !Array.isArray(classes) || !classes.includes("language-mermaid")) return;

            parent.children[index] = {
                type: "element",
                tagName: "figure",
                properties: { dataMermaid: "" },
                children: [{ type: "text", value: toString(code) }],
            };
        });
    };
}
