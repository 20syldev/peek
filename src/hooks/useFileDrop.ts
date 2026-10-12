import { useEffect, useEffectEvent, useState } from "react";

/**
 * Tells whether a drag carries files, as opposed to text or links.
 *
 * @param event - Window drag event; its dataTransfer may be null
 * @returns True when files are being dragged
 */
function hasFiles(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes("Files") ?? false;
}

/**
 * Accepts files dropped anywhere on the page. Enter and leave events fire
 * for every element crossed, so a depth counter, reset when the pointer
 * leaves the window, tells when the drag is really over.
 *
 * @param onFile - Receives the first dropped file
 * @returns True while files are dragged over the page
 */
export function useFileDrop(onFile: (file: File) => void): boolean {
    const [dragging, setDragging] = useState(false);
    const onDropFile = useEffectEvent(onFile);

    useEffect(() => {
        let depth = 0;

        const enter = (event: DragEvent) => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            depth += 1;
            setDragging(true);
        };
        const over = (event: DragEvent) => {
            if (hasFiles(event)) event.preventDefault();
        };
        const leave = (event: DragEvent) => {
            if (!hasFiles(event)) return;
            // No related target: the pointer left the window, whatever the count says
            depth = event.relatedTarget === null ? 0 : Math.max(0, depth - 1);
            if (depth === 0) setDragging(false);
        };
        const drop = (event: DragEvent) => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            depth = 0;
            setDragging(false);
            const file = event.dataTransfer?.files[0];
            if (file) onDropFile(file);
        };

        window.addEventListener("dragenter", enter);
        window.addEventListener("dragover", over);
        window.addEventListener("dragleave", leave);
        window.addEventListener("drop", drop);
        return () => {
            window.removeEventListener("dragenter", enter);
            window.removeEventListener("dragover", over);
            window.removeEventListener("dragleave", leave);
            window.removeEventListener("drop", drop);
        };
    }, []);

    return dragging;
}
