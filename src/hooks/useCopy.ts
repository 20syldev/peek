import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "failed";

/**
 * Copies text to the clipboard and exposes a short-lived status for the
 * button feedback and its screen reader announcement.
 *
 * @param duration - How long the copied or failed status lasts, in milliseconds
 * @returns The status and the copy function
 */
export function useCopy(duration = 2000) {
    const [status, setStatus] = useState<CopyStatus>("idle");
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const copy = useCallback(
        async (text: string) => {
            let next: CopyStatus = "copied";
            try {
                await navigator.clipboard.writeText(text);
            } catch {
                next = "failed";
            }
            setStatus(next);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setStatus("idle"), duration);
        },
        [duration],
    );

    return { status, copy };
}
