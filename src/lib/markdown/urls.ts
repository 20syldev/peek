import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

import { githubPageOf, isMarkdownPath } from "@/lib/source";
import type { RemoteSource } from "@/types/readme";

const SCHEME = /^[a-z][a-z\d+.-]*:/i;

/**
 * Tells whether a reference is relative to the document, as opposed to an
 * anchor, an absolute URL or a protocol-relative one.
 *
 * @param value - href, src or srcset entry found in the document
 * @returns True for paths such as "docs/a.md", "../a.png" or "/LICENSE"
 */
function isRelative(value: string): boolean {
    const trimmed = value.trim();
    return (
        trimmed !== "" &&
        !trimmed.startsWith("#") &&
        !trimmed.startsWith("//") &&
        !SCHEME.test(trimmed)
    );
}

/**
 * Resolves a relative reference against the fetched file. Root-relative
 * paths point at the repository root when the source knows it, as on GitHub.
 *
 * @param value - Relative reference, as accepted by isRelative
 * @param source - Remote document the reference appears in
 * @returns The absolute http(s) URL, or null when it cannot be parsed or leaves http(s)
 */
function resolve(value: string, source: RemoteSource): URL | null {
    const trimmed = value.trim();
    try {
        // "./" keeps a first segment such as "javascript:x" a path instead of a scheme
        const url =
            source.root && trimmed.startsWith("/")
                ? new URL(`./${trimmed.replace(/^\/+/, "")}`, source.root)
                : new URL(trimmed, source.url);
        return url.protocol === "https:" || url.protocol === "http:" ? url : null;
    } catch {
        return null;
    }
}

/**
 * Rewrites a link target. Markdown files open in the viewer through a
 * `?url=` link; other repository files open on their GitHub page.
 *
 * @param url - Absolute target
 * @returns The href to render
 */
function linkTarget(url: URL): string {
    if (isMarkdownPath(url.pathname)) {
        const hash = url.hash;
        const file = new URL(url);
        file.hash = "";
        const page = githubPageOf(file) ?? file.toString();
        return `?url=${encodeURIComponent(page)}${hash}`;
    }
    return githubPageOf(url) ?? url.toString();
}

/**
 * Resolves the URL of one srcset candidate, keeping its size descriptor.
 *
 * @param candidate - A "url descriptor" entry, e.g. "logo@2x.png 2x"
 * @param source - Remote document the candidate appears in
 * @returns The rewritten candidate
 */
function resolveCandidate(candidate: string, source: RemoteSource): string {
    const [url, ...descriptors] = candidate.trim().split(/\s+/);
    const resolved = isRelative(url) ? resolve(url, source) : null;
    return [resolved ? resolved.toString() : url, ...descriptors].join(" ");
}

/**
 * Turns a relative link of a local document into inert text: there is no
 * address to resolve it against, and following it would leave the page and
 * lose the document.
 *
 * @param node - Link element, mutated in place
 * @param title - Tooltip explaining why the link is inert
 */
function disarm(node: Element, title: string) {
    delete node.properties.href;
    node.properties.dataUnresolved = "";
    node.properties.title = title;
}

/**
 * Rehype plugin resolving relative links and images against the address the
 * document was fetched from, so a README behaves as it does in its
 * repository; in local documents, relative links are disarmed instead.
 *
 * @param options - The remote source, when the document came from a link, and the tooltip of a disarmed link
 * @returns The tree transformer
 */
export function rehypeUrls(options: { source?: RemoteSource; unresolved: string }) {
    return (tree: Root) => {
        const { source } = options;

        visit(tree, "element", (node: Element) => {
            const { href, src, srcSet } = node.properties;
            if (node.tagName === "a" && typeof href === "string" && isRelative(href)) {
                const url = source ? resolve(href, source) : null;
                if (url) node.properties.href = linkTarget(url);
                else disarm(node, options.unresolved);
            }
            if (!source) return;

            if (typeof src === "string" && isRelative(src)) {
                const url = resolve(src, source);
                if (url) node.properties.src = url.toString();
            }
            if (typeof srcSet === "string" || Array.isArray(srcSet)) {
                const candidates = Array.isArray(srcSet) ? srcSet.map(String) : srcSet.split(",");
                node.properties.srcSet = candidates
                    .map((candidate) => resolveCandidate(candidate, source))
                    .join(", ");
            }
        });
    };
}
