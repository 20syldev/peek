import type { Root } from "mdast";

import { inlineElement, replaceText } from "@/lib/markdown/text";

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const CLOSING_FENCE = /^\s{0,3}(`{3,}|~{3,})\s*$/;
const QUOTE_FENCE = /^>>>\s*$/;
/**
 * Inline diff markers: {+ added +}, [+ added +], {- removed -} and [- removed -].
 * Each body stops at the next opener of its own kind, which keeps unclosed
 * markers linear instead of quadratic.
 */
const INLINE_DIFF =
    /\{\+((?:(?!\{\+)[^\n])+?)\+\}|\[\+((?:(?!\[\+)[^\n])+?)\+\]|\{-((?:(?!\{-)[^\n])+?)-\}|\[-((?:(?!\[-)[^\n])+?)-\]/g;

/**
 * Expands GitLab multiline blockquotes, written between two ">>>" lines, into
 * regular "> " prefixed lines. A ">>>" line inside a fenced code block is kept literal.
 *
 * @param content - Markdown source
 * @returns The source with every multiline blockquote expanded
 */
export function expandQuoteFences(content: string): string {
    let fence: string | null = null;
    let quoting = false;

    return content
        .split("\n")
        .flatMap((line) => {
            if (fence) {
                const closing = CLOSING_FENCE.exec(line)?.[1];
                if (closing && closing[0] === fence[0] && closing.length >= fence.length)
                    fence = null;
            } else if (FENCE.test(line)) {
                fence = FENCE.exec(line)?.[1] ?? null;
            } else if (QUOTE_FENCE.test(line)) {
                quoting = !quoting;
                // A blank line ends the quote, so the next line is not a lazy continuation
                return quoting ? [] : [""];
            }
            return quoting ? [line.trim() === "" ? ">" : `> ${line}`] : [line];
        })
        .join("\n");
}

/**
 * Remark plugin for GitLab inline diffs, rendered as ins and del elements.
 *
 * @returns The tree transformer
 */
export function remarkInlineDiff() {
    return (tree: Root) =>
        replaceText(tree, INLINE_DIFF, (match) => {
            const added = match[1] ?? match[2];
            const removed = match[3] ?? match[4];
            if (added !== undefined) return [inlineElement("ins", added.trim())];
            return [{ type: "delete", children: [{ type: "text", value: removed.trim() }] }];
        });
}
