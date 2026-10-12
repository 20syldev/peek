import type { Root, RootContent, TableCell } from "mdast";
import { parse } from "yaml";

export type FrontmatterMode = "table" | "code";

/**
 * Formats a front matter value for a table cell. Lists of scalars read as a
 * comma separated list; nested structures fall back to JSON.
 *
 * @param value - Parsed YAML value
 * @returns The cell text, empty for null
 */
function format(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value !== "object") return String(value);
    if (Array.isArray(value) && value.every((item) => typeof item !== "object")) {
        return value.join(", ");
    }
    return JSON.stringify(value);
}

/**
 * Creates a table cell holding plain text.
 *
 * @param value - Cell text
 * @returns A table cell with a single text child
 */
function cell(value: string): TableCell {
    return { type: "tableCell", children: [{ type: "text", value }] };
}

/**
 * Renders YAML front matter as GitHub does, a one-row table keyed by its
 * fields, or falls back to a code block when it is not a YAML mapping.
 *
 * @param value - Raw front matter, without the delimiters
 * @param lang - "yaml" or "toml"
 * @param mode - Table (GitHub, Obsidian properties) or code block (GitLab)
 * @returns The block that replaces the front matter
 */
function render(value: string, lang: string, mode: FrontmatterMode): RootContent {
    const code: RootContent = { type: "code", lang, value };
    if (mode === "code" || lang !== "yaml") return code;

    // YAML aliases can build cycles that JSON.stringify rejects: any failure falls back to code
    try {
        const data: unknown = parse(value);
        if (!data || typeof data !== "object" || Array.isArray(data)) return code;

        const entries = Object.entries(data);
        return {
            type: "table",
            align: entries.map(() => null),
            children: [
                { type: "tableRow", children: entries.map(([key]) => cell(key)) },
                { type: "tableRow", children: entries.map(([, item]) => cell(format(item))) },
            ],
        };
    } catch {
        return code;
    }
}

/**
 * Remark plugin replacing the front matter node produced by remark-frontmatter,
 * which renders nothing on its own, by a visible block.
 *
 * @param options - How the front matter is displayed
 * @returns The tree transformer
 */
export function remarkFrontmatterBlock(options: { mode: FrontmatterMode }) {
    return (tree: Root) => {
        const first = tree.children[0] as { type: string; value?: string } | undefined;
        if (!first || (first.type !== "yaml" && first.type !== "toml")) return;
        tree.children[0] = render(first.value ?? "", first.type, options.mode);
    };
}
