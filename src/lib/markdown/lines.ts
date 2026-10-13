import type { Root } from "hast";

/**
 * Rehype plugin recording the source line of every top-level block, as a
 * `data-line` attribute, so the editor and its preview can scroll together.
 * It runs after sanitization, so the attribute is trusted.
 *
 * @returns The tree transformer
 */
export function rehypeLines() {
    return (tree: Root) => {
        for (const node of tree.children) {
            if (node.type === "element" && node.position) {
                node.properties.dataLine = node.position.start.line;
            }
        }
    };
}
