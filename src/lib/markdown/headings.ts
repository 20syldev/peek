import GithubSlugger from "github-slugger";
import type { Root } from "hast";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";

export type SlugStyle = "github" | "gitlab";

// Same namespace as sanitized raw HTML ids, so headings never clash with the app's own ids
const PREFIX = "user-content-";
const HEADING = /^h[1-6]$/;

/**
 * Slugs a heading the way GitLab does: lowercase, non-word characters
 * removed, spaces turned into hyphens and runs of hyphens collapsed.
 *
 * @param text - Plain text of the heading
 * @returns The slug, before deduplication; may be empty for a heading of symbols
 */
function gitlabSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_\s-]/gu, "")
        .trim()
        .replace(/\s/g, "-")
        .replace(/-{2,}/g, "-");
}

/**
 * Rehype plugin giving every heading without an id a prefixed slug, so
 * in-document links ("#installation") resolve as they do on the original
 * forge. Runs after sanitization: raw HTML ids keep their own prefixed value,
 * and no generated id repeats one already in the document.
 *
 * @param options - Slug algorithm of the flavor
 * @returns The tree transformer
 */
export function rehypeHeadingIds(options: { style: SlugStyle }) {
    return (tree: Root) => {
        const github = new GithubSlugger();
        const used = new Set<string>();

        visit(tree, "element", (node) => {
            if (typeof node.properties.id === "string") used.add(node.properties.id);
        });

        const unique = (base: string) => {
            let id = `${PREFIX}${base}`;
            for (let count = 1; used.has(id); count++) id = `${PREFIX}${base}-${count}`;
            used.add(id);
            return id;
        };

        visit(tree, "element", (node) => {
            if (!HEADING.test(node.tagName) || node.properties.id) return;
            const text = toString(node);
            node.properties.id = unique(
                options.style === "gitlab" ? gitlabSlug(text) : github.slug(text),
            );
        });
    };
}
