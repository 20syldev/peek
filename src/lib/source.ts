import type { RemoteSource } from "@/types/readme";

export type SourceErrorCode =
    | "emptyLink"
    | "invalidLink"
    | "badProtocol"
    | "notRepository"
    | "notFile"
    | "rawIncomplete"
    | "gistIncomplete"
    | "tooLarge"
    | "notText"
    | "notMarkdown"
    | "unreachable"
    | "notFound"
    | "serverStatus"
    | "webPage";

/**
 * Error raised when a link, a file or a response cannot become a Markdown
 * source. It carries a code, with the values its message needs, that the
 * interface turns into a sentence in the language of the page.
 */
export class SourceError extends Error {
    readonly code: SourceErrorCode;
    readonly values: Record<string, string | number>;

    constructor(code: SourceErrorCode, values: Record<string, string | number> = {}) {
        super(code);
        this.code = code;
        this.values = values;
    }
}

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const RAW_HOST = "raw.githubusercontent.com";
const GIST_HOST = "gist.github.com";
const GIST_RAW_HOST = "gist.githubusercontent.com";
const MARKDOWN_EXTENSION = /\.(md|markdown|mdown|mkdn|mkd|mdx)$/i;
// Spellings GitHub also renders as the README of a repository or folder
const README_NAMES = ["README.md", "readme.md", "Readme.md", "README.markdown", "README"];

/**
 * Parses what the user typed into an absolute http(s) URL, adding the scheme
 * when it was left out ("github.com/user/repo").
 *
 * @param input - Raw text from the link field or the `?url=` parameter
 * @returns The parsed URL, without its fragment
 */
function parseInput(input: string): URL {
    const trimmed = input.trim();
    if (!trimmed) throw new SourceError("emptyLink");

    const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let url: URL;
    try {
        url = new URL(withScheme);
    } catch {
        throw new SourceError("invalidLink");
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new SourceError("badProtocol");
    }
    url.hash = "";
    return url;
}

/**
 * Decodes one path segment, keeping it as is when it holds a lone "%".
 *
 * @param part - Percent-encoded segment taken from URL.pathname
 * @returns The decoded segment, or the raw one when it is not valid encoding
 */
function decode(part: string): string {
    try {
        return decodeURIComponent(part);
    } catch {
        return part;
    }
}

/**
 * Splits a URL path into its decoded, non-empty segments.
 *
 * @param url - Parsed URL whose pathname is split on "/"
 * @returns Segments in order, so "/a//b/" gives ["a", "b"]
 */
function segments(url: URL): string[] {
    return url.pathname.split("/").filter(Boolean).map(decode);
}

/**
 * Separates the ref from the file path. Raw buttons produce full refs such
 * as "refs/heads/main", which span three segments.
 *
 * @param parts - Segments after "owner/repo" (and after the view name on github.com)
 * @returns The ref and the remaining path segments
 */
function splitRef(parts: string[]): { ref: string; path: string[] } {
    if (parts[0] === "refs" && (parts[1] === "heads" || parts[1] === "tags") && parts[2]) {
        return { ref: parts.slice(0, 3).join("/"), path: parts.slice(3) };
    }
    return { ref: parts[0], path: parts.slice(1) };
}

/**
 * Percent-encodes path segments and joins them with "/".
 *
 * @param parts - Decoded segments; a ref like "refs/heads/main" may hold slashes
 * @returns The encoded path, slashes inside refs kept as separators
 */
function encodePath(parts: string[]): string {
    return parts
        .flatMap((part) => part.split("/"))
        .map(encodeURIComponent)
        .join("/");
}

/**
 * Builds the source of a file stored in a GitHub repository.
 *
 * @param input - Original user input, kept verbatim for sharing
 * @param owner - User or organization login, decoded
 * @param repo - Repository name, decoded and without a trailing ".git"
 * @param ref - Branch, tag, full ref or commit; "HEAD" targets the default branch
 * @param path - File path inside the repository, segment by segment, never empty
 * @returns The raw address, the blob page (the repository page for a root file at HEAD) and the repository root at that ref
 */
function githubFile(
    input: string,
    owner: string,
    repo: string,
    ref: string,
    path: string[],
): RemoteSource {
    const repoPage = `https://github.com/${encodePath([owner, repo])}`;
    const root = `https://${RAW_HOST}/${encodePath([owner, repo, ref])}/`;
    const isRoot = ref === "HEAD" && path.length === 1;
    return {
        input,
        url: `${root}${encodePath(path)}`,
        page: isRoot ? repoPage : `${repoPage}/blob/${encodePath([ref, ...path])}`,
        crumbs: ["github.com", owner, repo, ...(isRoot ? [] : [ref]), ...path.slice(0, -1)],
        name: path[path.length - 1],
        root,
    };
}

/**
 * Builds the source of the README of a repository or folder, whose exact
 * file name is unknown: README.md first, the other spellings as fallbacks.
 *
 * @param input - Original user input, kept verbatim for sharing
 * @param owner - User or organization login, decoded
 * @param repo - Repository name, decoded and without a trailing ".git"
 * @param ref - Branch, tag, full ref or commit; "HEAD" targets the default branch
 * @param folder - Folder path inside the repository, empty for the root
 * @returns The README.md source, carrying the other spellings as alternatives
 */
function githubReadme(
    input: string,
    owner: string,
    repo: string,
    ref: string,
    folder: string[],
): RemoteSource {
    const [first, ...others] = README_NAMES.map((name) =>
        githubFile(input, owner, repo, ref, [...folder, name]),
    );
    return { ...first, alternatives: others };
}

/**
 * Resolves a github.com page (repository, folder, blob or raw view) to the
 * raw Markdown file GitHub would render for it.
 *
 * @param input - Original user input, kept verbatim for sharing
 * @param url - Parsed github.com URL
 * @returns The source of the file, or of the folder README; other views throw a SourceError
 */
function fromGithub(input: string, url: URL): RemoteSource {
    const [owner, rawRepo, view, ...rest] = segments(url);
    if (!owner || !rawRepo) {
        throw new SourceError("notRepository");
    }
    const repo = rawRepo.replace(/\.git$/, "");

    if (!view) return githubReadme(input, owner, repo, "HEAD", []);
    if (rest.length === 0) throw new SourceError("notFile");

    const { ref, path } = splitRef(rest);
    if (view === "tree") return githubReadme(input, owner, repo, ref, path);
    if ((view === "blob" || view === "raw") && path.length > 0) {
        return githubFile(input, owner, repo, ref, path);
    }
    throw new SourceError("notFile");
}

/**
 * Turns a user-provided link into the raw Markdown address to fetch. GitHub
 * repositories, folders, blobs and gists map to their raw files, with exact
 * hostname matching; any other http(s) link is fetched as is.
 *
 * @param input - Text typed by the user or read from `?url=`
 * @returns The source to fetch and display
 */
export function resolveSource(input: string): RemoteSource {
    const url = parseInput(input);
    const host = url.hostname.toLowerCase();

    if (GITHUB_HOSTS.has(host)) return fromGithub(input, url);

    if (host === RAW_HOST) {
        const [owner, repo, ...rest] = segments(url);
        const { ref, path } = splitRef(rest);
        if (!owner || !repo || !ref || path.length === 0) {
            throw new SourceError("rawIncomplete");
        }
        return githubFile(input, owner, repo, ref, path);
    }

    if (host === GIST_HOST) {
        const [user, id] = segments(url);
        if (!user || !id) throw new SourceError("gistIncomplete");
        return {
            input,
            url: `https://${GIST_RAW_HOST}/${encodePath([user, id])}/raw`,
            page: `https://${GIST_HOST}/${encodePath([user, id])}`,
            crumbs: ["gist.github.com", user],
            name: "Gist",
        };
    }

    const parts = segments(url);
    return {
        input,
        url: url.toString(),
        page: url.toString(),
        crumbs: [host, ...parts.slice(0, -1)],
        name: parts[parts.length - 1] ?? host,
    };
}

/**
 * Tells whether a path points to a Markdown file, judging by its extension.
 *
 * @param path - URL pathname or file name, compared case-insensitively
 * @returns True for .md, .markdown and the other common Markdown extensions
 */
export function isMarkdownPath(path: string): boolean {
    return MARKDOWN_EXTENSION.test(path);
}

/**
 * Maps a raw.githubusercontent.com address back to its github.com blob page,
 * so links to non-Markdown repository files open where GitHub would show them.
 *
 * @param url - Absolute URL, usually resolved against a raw README
 * @returns The blob page with the same hash, or null when the URL is not a raw GitHub file
 */
export function githubPageOf(url: URL): string | null {
    if (url.hostname !== RAW_HOST) return null;
    const [owner, repo, ...rest] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo || rest.length === 0) return null;
    return `https://github.com/${owner}/${repo}/blob/${rest.join("/")}${url.hash}`;
}
