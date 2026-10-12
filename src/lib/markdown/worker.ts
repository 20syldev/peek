import { type Rendered, renderMarkdown, type RenderOptions } from "@/lib/markdown/pipeline";

export interface RenderRequest {
    id: number;
    content: string;
    options: RenderOptions;
}

export interface RenderResponse {
    ready?: boolean;
    id: number;
    rendered?: Rendered;
}

// Only what this worker uses of its global scope; the DOM typings describe a window
interface WorkerScope {
    onmessage: ((event: MessageEvent<RenderRequest>) => void) | null;
    postMessage: (message: RenderResponse) => void;
}

const scope = self as unknown as WorkerScope;

/**
 * Renders each request and posts the result back, or the bare id when the
 * pipeline throws so the client can reject it.
 *
 * @param event - Render request posted by renderInWorker
 */
scope.onmessage = (event) => {
    const { id, content, options } = event.data;
    try {
        scope.postMessage({ id, rendered: renderMarkdown(content, options) });
    } catch {
        scope.postMessage({ id });
    }
};

scope.postMessage({ id: 0, ready: true });
