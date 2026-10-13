import type { Rendered, RenderOptions } from "@/lib/markdown/pipeline";
import type { RenderRequest, RenderResponse } from "@/lib/markdown/worker";

/**
 * Past this delay of pure rendering, the document is deemed hostile or too
 * heavy and the worker is killed.
 */
const RENDER_TIMEOUT_MS = 8000;

/**
 * Longest wait for the worker bundle to download and start, counted apart so
 * a slow network is not mistaken for a heavy document.
 */
const STARTUP_TIMEOUT_MS = 30000;

/**
 * Rejection of a render that a newer request replaced; not an error to show.
 */
export class RenderAborted extends Error {}

/**
 * Rejection of a render that ran past the time limit.
 */
export class RenderTimeout extends Error {}

/**
 * Rejection of a render whose pipeline threw on this document, or whose
 * worker kept failing to start.
 */
export class RenderFailed extends Error {}

interface Pending {
    request: RenderRequest;
    resolve: (rendered: Rendered) => void;
    reject: (error: Error) => void;
    timer: number;
    retried: boolean;
}

interface Queued {
    content: string;
    options: RenderOptions;
    resolve: (rendered: Rendered) => void;
    reject: (error: Error) => void;
}

let worker: Worker | null = null;
let ready = false;
let pending: Pending | null = null;
let queued: Queued | null = null;
let nextId = 0;

/**
 * Stops the worker and settles the pending render, if any. A fresh worker
 * starts with the next render, which is the only way to interrupt a
 * pathological document since the pipeline is synchronous. A request waiting
 * behind the stopped render then runs on it, unless the stop is an abort,
 * which drops that request too.
 *
 * @param error - Rejection given to the pending render
 */
function reset(error: Error) {
    worker?.terminate();
    worker = null;
    ready = false;
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pending.reject(error);
    pending = null;
    if (error instanceof RenderAborted) {
        queued?.reject(error);
        queued = null;
    } else {
        runQueued();
    }
}

/**
 * Restarts the countdown of the pending render with the given limit.
 *
 * @param pendingRender - Render whose timer is replaced
 * @param delay - New limit in milliseconds
 */
function arm(pendingRender: Pending, delay: number) {
    window.clearTimeout(pendingRender.timer);
    pendingRender.timer = window.setTimeout(
        () => reset(delay === STARTUP_TIMEOUT_MS ? new RenderFailed() : new RenderTimeout()),
        delay,
    );
}

/**
 * Handles what the worker posts: the ready signal, which starts the render
 * countdown, or the answer to the pending render.
 *
 * @param event - Message posted by lib/markdown/worker.ts
 */
function onMessage(event: MessageEvent<RenderResponse>) {
    if (event.data.ready) {
        ready = true;
        if (pending) arm(pending, RENDER_TIMEOUT_MS);
        return;
    }
    const { id, rendered } = event.data;
    if (!pending || pending.request.id !== id) return;
    window.clearTimeout(pending.timer);
    if (rendered) pending.resolve(rendered);
    else pending.reject(new RenderFailed());
    pending = null;
    runQueued();
}

/**
 * Handles a worker crash. A worker killed while it was still loading its
 * scripts can make the next one fail to load them too, so the pending request
 * is resent once to a fresh worker before giving up.
 */
function onError() {
    if (!pending || pending.retried) return reset(new RenderFailed());
    worker?.terminate();
    ready = false;
    worker = spawn();
    pending.retried = true;
    arm(pending, STARTUP_TIMEOUT_MS);
    worker.postMessage(pending.request);
}

/**
 * Starts a rendering worker wired to the module handlers.
 *
 * @returns The new worker, not yet holding any request
 */
function spawn(): Worker {
    const created = new Worker(new URL("./worker.ts", import.meta.url));
    created.onmessage = onMessage;
    created.onerror = onError;
    return created;
}

/**
 * Starts the worker ahead of the first render, so its bundle downloads while
 * the user is still picking a document.
 */
export function warmUpWorker() {
    if (!worker) worker = spawn();
}

/**
 * Sends a request to the worker, starting it when needed, and counts down
 * its time limit.
 *
 * @param content - Markdown source, untrusted
 * @param options - Flavor and remote source, as for renderMarkdown
 * @returns The rendered tree; rejects with RenderAborted, RenderTimeout or RenderFailed
 */
function start(content: string, options: RenderOptions): Promise<Rendered> {
    const current = worker ?? spawn();
    worker = current;

    return new Promise<Rendered>((resolve, reject) => {
        nextId += 1;
        const request: RenderRequest = { id: nextId, content, options };
        const render: Pending = { request, resolve, reject, timer: 0, retried: false };
        pending = render;
        arm(render, ready ? RENDER_TIMEOUT_MS : STARTUP_TIMEOUT_MS);
        current.postMessage(request);
    });
}

/**
 * Starts the request that waited for the running render, once it is over.
 */
function runQueued() {
    if (!queued || pending) return;
    const next = queued;
    queued = null;
    start(next.content, next.options).then(next.resolve, next.reject);
}

/**
 * Renders Markdown off the main thread, so a heavy or hostile document never
 * freezes the page. Only the latest request matters: by default a new one
 * cancels the previous render, and one that exceeds the time limit kills the
 * worker. A request that does not interrupt, such as a keystroke in the
 * editor, waits for the running render instead, so typing never restarts the
 * worker; only the latest waiting request is kept.
 *
 * @param content - Markdown source, untrusted
 * @param options - Flavor and remote source, as for renderMarkdown
 * @param mode - Options of the request; `interrupt: false` waits for the running render
 * @returns The rendered tree; rejects with RenderAborted, RenderTimeout or RenderFailed
 */
export function renderInWorker(
    content: string,
    options: RenderOptions,
    { interrupt = true }: { interrupt?: boolean } = {},
): Promise<Rendered> {
    if (pending && interrupt) reset(new RenderAborted());
    if (!pending) return start(content, options);

    return new Promise<Rendered>((resolve, reject) => {
        queued?.reject(new RenderAborted());
        queued = { content, options, resolve, reject };
    });
}
