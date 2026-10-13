import type { Element, Root } from "hast";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkFrontmatter from "remark-frontmatter";
import remarkGemoji from "remark-gemoji";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype, { type Options as RemarkRehypeOptions } from "remark-rehype";
import { type PluggableList, unified } from "unified";
import { visit } from "unist-util-visit";

import { rehypeAlerts } from "@/lib/markdown/alerts";
import { remarkFrontmatterBlock } from "@/lib/markdown/frontmatter";
import { expandQuoteFences, remarkInlineDiff } from "@/lib/markdown/gitlab";
import { rehypeHeadingIds } from "@/lib/markdown/headings";
import { rehypeMath } from "@/lib/markdown/katex";
import type { RenderLabels } from "@/lib/markdown/labels";
import { rehypeLines } from "@/lib/markdown/lines";
import { remarkMathBackticks } from "@/lib/markdown/math";
import { rehypeMermaid } from "@/lib/markdown/mermaid";
import { remarkObsidian, stripComments } from "@/lib/markdown/obsidian";
import { collectHeadings } from "@/lib/markdown/outline";
import { SCHEMA } from "@/lib/markdown/schema";
import { rehypeToc } from "@/lib/markdown/toc";
import { rehypeUrls } from "@/lib/markdown/urls";
import type { Flavor, Heading, RemoteSource } from "@/types/readme";

export interface RenderOptions {
    flavor: Flavor;
    source?: RemoteSource;
    labels: RenderLabels;
}

/**
 * Options of the Markdown to HTML step. Footnote ids stay unprefixed here;
 * sanitization adds "user-content-" once.
 *
 * @param labels - Texts of the footnote section
 * @returns The remark-rehype options
 */
function remarkRehypeOptions(labels: RenderLabels): RemarkRehypeOptions {
    return {
        allowDangerousHtml: true,
        clobberPrefix: "",
        footnoteLabel: labels.footnotes,
        footnoteBackLabel: (index) => labels.footnoteBack.replace("{index}", String(index + 1)),
        footnoteBackContent: labels.footnoteBackText,
    };
}

export interface Rendered {
    tree: Root;
    headings: Heading[];
}

/**
 * Lists the remark plugins of a flavor, each one enabling only the syntax
 * the original tool renders.
 *
 * @param flavor - Markdown dialect to follow
 * @returns The remark plugins, in order
 */
function remarkPlugins(flavor: Flavor): PluggableList {
    if (flavor === "commonmark") return [];

    const shared: PluggableList = [
        [remarkFrontmatter, ["yaml", "toml"]],
        [remarkFrontmatterBlock, { mode: flavor === "gitlab" ? "code" : "table" }],
        remarkGfm,
        remarkMath,
    ];
    if (flavor === "obsidian") return [...shared, remarkObsidian];

    const forge: PluggableList = [...shared, remarkMathBackticks, remarkGemoji];
    return flavor === "gitlab" ? [...forge, remarkInlineDiff] : forge;
}

/**
 * Rehype plugin making horizontally scrollable formulas reachable with the
 * keyboard, since browsers do not all focus scroll containers on their own.
 *
 * @returns The tree transformer
 */
function rehypeScrollable() {
    return (tree: Root) => {
        visit(tree, "element", (node: Element) => {
            const classes = node.properties.className;
            if (!Array.isArray(classes) || !classes.includes("katex-display")) return;
            node.properties.tabIndex = 0;
        });
    };
}

/**
 * Lists the rehype plugins of a flavor. Sanitization comes first so every
 * later plugin works on trusted markup and may add its own attributes.
 *
 * @param flavor - Markdown dialect to follow
 * @param source - Remote source, for relative URL resolution
 * @param labels - Texts the plugins add to the document, in the language of the page
 * @returns The rehype plugins, in order
 */
function rehypePlugins(
    flavor: Flavor,
    source: RemoteSource | undefined,
    labels: RenderLabels,
): PluggableList {
    const safe: PluggableList = [
        rehypeRaw,
        [rehypeSanitize, SCHEMA],
        [rehypeHeadingIds, { style: flavor === "gitlab" ? "gitlab" : "github" }],
        [rehypeUrls, { source, unresolved: labels.relativeLink }],
    ];
    const highlight: PluggableList = [rehypeHighlight];
    if (flavor === "commonmark") return [...safe, ...highlight, rehypeLines];

    const rich: PluggableList = [
        ...safe,
        [rehypeAlerts, { mode: flavor, labels: labels.alerts }],
        rehypeMermaid,
        rehypeMath,
        rehypeScrollable,
    ];
    return flavor === "gitlab"
        ? [...rich, [rehypeToc, { label: labels.toc }], ...highlight, rehypeLines]
        : [...rich, ...highlight, rehypeLines];
}

/**
 * Applies the source-level rewrites a flavor needs before parsing.
 *
 * @param content - Markdown source
 * @param flavor - Markdown dialect to follow
 * @returns The source to parse
 */
function prepare(content: string, flavor: Flavor): string {
    if (flavor === "gitlab") return expandQuoteFences(content);
    if (flavor === "obsidian") return stripComments(content);
    return content;
}

/**
 * Renders Markdown to a sanitized hast tree and extracts what the reader
 * chrome needs from it: the outline and the word count.
 *
 * @param content - Markdown source, untrusted
 * @param options - Flavor, remote source and the texts the rendering adds
 * @returns The tree to render, its headings and its word count
 */
export function renderMarkdown(
    content: string,
    { flavor, source, labels }: RenderOptions,
): Rendered {
    const processor = unified()
        .use(remarkParse)
        .use(remarkPlugins(flavor))
        .use(remarkRehype, remarkRehypeOptions(labels))
        .use(rehypePlugins(flavor, source, labels));

    const tree = processor.runSync(processor.parse(prepare(content, flavor))) as Root;
    return { tree, headings: collectHeadings(tree) };
}
