import type { InlineCode, Root, Text } from "mdast";
import type { InlineMath } from "mdast-util-math";
import { visit } from "unist-util-visit";

/**
 * Remark plugin for the GitHub and GitLab "$`x`$" inline math syntax, which
 * delimits the formula with a code span so Markdown never touches it. Both
 * ways micromark can parse it are handled: as inline math wrapping a code
 * span, or as a code span flanked by two dollar signs.
 *
 * @returns The tree transformer
 */
export function remarkMathBackticks() {
    return (tree: Root) => {
        visit(tree, "inlineMath", (node: InlineMath) => {
            const match = /^`([\s\S]+)`$/.exec(node.value);
            if (!match) return;
            node.value = match[1];
            // remark-math copies the value into hChildren, which is what gets rendered
            node.data = { ...node.data, hChildren: [{ type: "text", value: match[1] }] };
        });

        visit(tree, "inlineCode", (node: InlineCode, index, parent) => {
            if (!parent || index === undefined) return;
            const before = parent.children[index - 1];
            const after = parent.children[index + 1];
            if (before?.type !== "text" || after?.type !== "text") return;
            if (!(before as Text).value.endsWith("$") || !(after as Text).value.startsWith("$")) {
                return;
            }

            (before as Text).value = (before as Text).value.slice(0, -1);
            (after as Text).value = (after as Text).value.slice(1);
            node.data = {
                ...node.data,
                hProperties: { className: ["language-math", "math-inline"] },
            };
        });
    };
}
