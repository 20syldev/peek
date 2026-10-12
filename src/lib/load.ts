import { isMarkdownPath, SourceError } from "@/lib/source";
import type { RemoteSource } from "@/types/readme";

// Large enough for any real README, small enough to keep the renderer responsive
const MAX_BYTES = 5 * 1024 * 1024;
const TEXT_EXTENSION = /\.(txt|text)$/i;

/**
 * 404 answer, kept apart so the README fallbacks can be tried before giving up.
 */
class NotFoundError extends SourceError {}

/**
 * Rejects decoded text that is obviously binary.
 *
 * @param text - Decoded file or response body, already within the size limit
 * @returns The same text, once validated
 */
function checkText(text: string): string {
    if (text.includes("\u0000")) throw new SourceError("notText");
    return text;
}

/**
 * Reads a response body as UTF-8 text, giving up as soon as it exceeds the
 * size limit. Content-Length cannot be trusted for this: it is missing on
 * chunked responses and counts compressed bytes.
 *
 * @param response - Successful response whose body has not been read yet
 * @returns The decoded body
 */
async function readBody(response: Response): Promise<string> {
    if (!response.body) return "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let size = 0;

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) {
            await reader.cancel();
            throw new SourceError("tooLarge");
        }
        chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
}

/**
 * Fetches one address and maps every failure (network, CORS, HTTP status,
 * HTML page instead of a file) to a SourceError.
 *
 * @param url - Raw address produced by resolveSource
 * @param signal - Aborts the request when another document is requested
 * @returns The Markdown source; a 404 throws a NotFoundError so callers can try another name
 */
async function fetchText(url: string, signal: AbortSignal): Promise<string> {
    let response: Response;
    try {
        response = await fetch(url, { signal });
    } catch (error) {
        if (signal.aborted) throw error;
        throw new SourceError("unreachable");
    }

    if (response.status === 404) {
        throw new NotFoundError("notFound");
    }
    if (!response.ok) throw new SourceError("serverStatus", { status: response.status });

    const type = response.headers.get("content-type") ?? "";
    if (type.includes("text/html")) {
        throw new SourceError("webPage");
    }
    return checkText(await readBody(response));
}

/**
 * Fetches a remote document. When its file name was guessed, the other
 * README spellings are tried in turn after a 404.
 *
 * @param source - Resolved source, possibly carrying alternatives
 * @param signal - Aborts the request when another document is requested
 * @returns The Markdown content and the source that actually answered
 */
export async function fetchSource(
    source: RemoteSource,
    signal: AbortSignal,
): Promise<{ content: string; source: RemoteSource }> {
    const candidates = [source, ...(source.alternatives ?? [])];
    let missing: unknown;
    for (const candidate of candidates) {
        try {
            return { content: await fetchText(candidate.url, signal), source: candidate };
        } catch (error) {
            if (!(error instanceof NotFoundError)) throw error;
            missing = error;
        }
    }
    throw missing;
}

/**
 * Reads a local file picked, dropped or pasted by the user. Markdown and
 * plain text files are accepted, by extension or by MIME type.
 *
 * @param file - File from an input, a drop or the clipboard
 * @returns The Markdown source
 */
export async function readMarkdownFile(file: File): Promise<string> {
    const named = isMarkdownPath(file.name) || TEXT_EXTENSION.test(file.name);
    if (!named && !file.type.startsWith("text/")) {
        throw new SourceError("notMarkdown");
    }
    if (file.size > MAX_BYTES) throw new SourceError("tooLarge");
    return checkText(await file.text());
}
