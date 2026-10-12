import { slug } from "github-slugger";
import type { PhrasingContent, Root } from "mdast";

import { inlineElement, replaceText } from "@/lib/markdown/text";

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const CLOSING_FENCE = /^\s{0,3}(`{3,}|~{3,})\s*$/;
// The body cannot contain "==", so an unclosed opener stops at the next one (linear time)
const HIGHLIGHT = /==(?=\S)((?:[^=\n]|=(?!=))*?\S)==/g;
// ![[embed]] or [[link]], with an optional #heading and |alias (or |width for images)
const WIKILINK = /(!?)\[\[([^[\]|#^]*)(#[^[\]|]*)?(?:\|([^[\]]*))?\]\]/g;
const TAG = /(^|[\s(])#([\p{L}_][\p{L}\p{N}_/-]*)/gu;
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i;

interface Span {
    start: number;
    end: number;
}

/**
 * Finds the inline code spans of a paragraph in linear time: one pass lists
 * the backtick runs, then each opener is matched with the next run of the
 * same length through a per-length pointer. A backtick escaped by a backslash
 * is literal, as in CommonMark.
 *
 * @param text - One paragraph, so spans never cross a blank line
 * @returns The spans, sorted, each covering both backtick runs
 */
function codeSpans(text: string): Span[] {
    const runs: { start: number; length: number }[] = [];
    const byLength = new Map<number, number[]>();
    for (const match of text.matchAll(/(\\*)(`+)/g)) {
        const escaped = match[1].length % 2 === 1;
        const length = match[2].length - (escaped ? 1 : 0);
        if (length === 0) continue;
        const start = match.index + match[1].length + (escaped ? 1 : 0);
        runs.push({ start, length });
        byLength.set(length, [...(byLength.get(length) ?? []), start]);
    }

    const pointers = new Map<number, number>();
    const spans: Span[] = [];
    let covered = 0;
    for (const { start, length } of runs) {
        if (start < covered) continue;
        const candidates = byLength.get(length) ?? [];
        let pointer = pointers.get(length) ?? 0;
        while (pointer < candidates.length && candidates[pointer] <= start) pointer++;
        pointers.set(length, pointer);
        if (pointer === candidates.length) continue;
        covered = candidates[pointer] + length;
        spans.push({ start, end: covered });
    }
    return spans;
}

/**
 * Removes the %%...%% comments of one paragraph, leaving code spans intact
 * since "%%" is literal there. An unclosed "%%" is kept as text.
 *
 * @param text - One paragraph of prose
 * @returns The paragraph without comments
 */
function stripParagraph(text: string): string {
    if (!text.includes("%%")) return text;

    const spans = codeSpans(text);
    let spanIndex = 0;

    const nextMarker = (from: number): number => {
        for (let index = text.indexOf("%%", from); index !== -1; index = text.indexOf("%%", from)) {
            while (spanIndex < spans.length && spans[spanIndex].end <= index) spanIndex++;
            const span = spans[spanIndex];
            if (!span || index < span.start) return index;
            from = span.end;
        }
        return -1;
    };

    const parts: string[] = [];
    let cursor = 0;
    for (let open = nextMarker(0); open !== -1; open = nextMarker(cursor)) {
        const close = nextMarker(open + 2);
        if (close === -1) break;
        parts.push(text.slice(cursor, open));
        cursor = close + 2;
    }
    parts.push(text.slice(cursor));
    return parts.join("");
}

/**
 * Removes Obsidian comments (%%...%%) outside fenced code blocks and code
 * spans, paragraph by paragraph.
 *
 * @param content - Markdown source
 * @returns The source without comments
 */
export function stripComments(content: string): string {
    const chunks: string[] = [];
    let prose: string[] = [];
    let fence: string | null = null;

    const flush = () => {
        if (prose.length === 0) return;
        const paragraphs = prose.join("\n").split(/(\n[ \t]*\n)/);
        chunks.push(
            paragraphs.map((part, index) => (index % 2 ? part : stripParagraph(part))).join(""),
        );
        prose = [];
    };

    for (const line of content.split("\n")) {
        if (fence) {
            chunks.push(line);
            const closing = CLOSING_FENCE.exec(line)?.[1];
            if (closing && closing[0] === fence[0] && closing.length >= fence.length) fence = null;
            continue;
        }
        const opener = FENCE.exec(line)?.[1];
        if (opener) {
            flush();
            chunks.push(line);
            fence = opener;
        } else {
            prose.push(line);
        }
    }
    flush();
    return chunks.join("\n");
}

/**
 * Encodes a vault path for use in a URL, keeping its folder separators.
 *
 * @param path - Note or attachment path as written in the wikilink
 * @returns The percent-encoded path
 */
function encodePath(path: string): string {
    return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * Builds the link or image a wikilink stands for. Notes are linked as
 * Markdown files so they open in the viewer; heading targets use the same
 * slugs as the rendered heading ids.
 *
 * @param match - Groups: embed sign, target, #heading, alias or image width
 * @returns The replacement nodes
 */
function wikilink(match: RegExpExecArray): PhrasingContent[] {
    const [, embed, rawTarget, rawHeading, alias] = match;
    const target = rawTarget.trim();
    const heading = rawHeading?.slice(1).trim();

    if (embed && IMAGE.test(target)) {
        const width = alias && /^\d+(x\d+)?$/.test(alias) ? alias.split("x")[0] : undefined;
        return [
            {
                type: "image",
                url: encodePath(target),
                alt: width ? target : (alias ?? target),
                data: width ? { hProperties: { width } } : undefined,
            },
        ];
    }

    const file = target && !/\.[a-z\d]+$/i.test(target) ? `${target}.md` : target;
    const url = `${file ? encodePath(file) : ""}${heading ? `#${slug(heading)}` : ""}`;
    const label = alias?.trim() || [target, heading].filter(Boolean).join(" > ");
    return [{ type: "link", url, children: [{ type: "text", value: label }] }];
}

/**
 * Remark plugin for Obsidian inline syntax: ==highlights==, [[wikilinks]],
 * ![[embeds]] and #tags.
 *
 * @returns The tree transformer
 */
export function remarkObsidian() {
    return (tree: Root) => {
        replaceText(tree, WIKILINK, wikilink);
        replaceText(tree, HIGHLIGHT, (match) => [inlineElement("mark", match[1])]);
        replaceText(tree, TAG, (match) => [
            { type: "text", value: match[1] },
            {
                type: "emphasis",
                data: { hName: "span", hProperties: { className: ["tag"] } },
                children: [{ type: "text", value: `#${match[2]}` }],
            },
        ]);
    };
}
