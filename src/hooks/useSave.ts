import { useCallback, useEffect, useRef, useState } from "react";

import type { FileHandle } from "@/lib/save";
import { saveText } from "@/lib/save";
import type { ReadmeDoc } from "@/types/readme";

export type SaveStatus = "idle" | "saved" | "failed";

type SaveKind = "file" | "download";

/**
 * Saves the text of a document and exposes a short-lived status for the
 * button feedback and its screen reader announcement. The file picked by the
 * first save is remembered, so later saves of the same document write to it
 * without asking again.
 *
 * @param doc - Document being edited; a new one forgets the picked file
 * @param duration - How long the saved or failed status lasts, in milliseconds
 * @returns The status and the save function, which resolves to how the text was saved: "file" when written in place, "download" as a copy, null when cancelled or failed
 */
export function useSave(doc: ReadmeDoc, duration = 2000) {
    const [status, setStatus] = useState<SaveStatus>("idle");
    const timer = useRef<number | undefined>(undefined);
    const picked = useRef<{ doc: ReadmeDoc; handle: FileHandle } | null>(null);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const save = useCallback(
        async (content: string): Promise<SaveKind | null> => {
            const handle = picked.current?.doc === doc ? picked.current.handle : undefined;
            let next: SaveStatus = "saved";
            try {
                const outcome = await saveText(content, doc.name, handle);
                if (outcome.result === "cancelled") return null;
                if (outcome.handle) picked.current = { doc, handle: outcome.handle };
            } catch {
                // The file may be gone or no longer writable: the next save asks for one again
                picked.current = null;
                next = "failed";
            }
            setStatus(next);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setStatus("idle"), duration);
            if (next === "failed") return null;
            return picked.current?.doc === doc ? "file" : "download";
        },
        [doc, duration],
    );

    return { status, save };
}
