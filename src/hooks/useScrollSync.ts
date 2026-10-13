import { type RefObject, useEffect } from "react";

import { type Anchor, interpolate, measureBlocks, measureLines } from "@/lib/scrollSync";

/**
 * Scrolls an editor and its preview together, as the Markdown editor of
 * VS Code does: by source line, so a long paragraph or a code block stays
 * aligned on both sides. Each block of the preview carries its source line;
 * the lines of the editor are measured once per text and width.
 *
 * @param editor - The text area
 * @param preview - The scrolling element holding the rendered document
 * @param enabled - Whether both are on screen side by side
 * @param version - Changes whenever the rendering changes, which moves the blocks
 */
export function useScrollSync(
    editor: RefObject<HTMLTextAreaElement | null>,
    preview: RefObject<HTMLElement | null>,
    enabled: boolean,
    version: unknown,
) {
    useEffect(() => {
        const area = editor.current;
        const pane = preview.current;
        if (!enabled || !area || !pane) return;

        let tops: number[] | null | undefined;
        let measured = "";
        let anchors: Anchor[] | undefined;
        // Scroll position each side was just moved to, so its own event is not taken as the user's
        const expected = { editor: null as number | null, preview: null as number | null };

        const lineTops = () => {
            const key = `${area.clientWidth}:${area.value}`;
            if (key !== measured || tops === undefined) {
                tops = measureLines(area);
                measured = key;
            }
            return tops;
        };

        const blocks = () => (anchors ??= measureBlocks(pane));

        /** Source lines and preview positions that match, ends included. */
        const scales = (lines: number[]) => {
            const found = blocks();
            const line = [1, ...found.map((block) => block.line), lines.length + 1];
            const top = [
                0,
                ...found.map((block) => block.top),
                pane.scrollHeight - pane.clientHeight,
            ];
            return { line, top };
        };

        const move = (element: HTMLElement, side: "editor" | "preview", value: number) => {
            const target = Math.max(0, value);
            const before = element.scrollTop;
            element.scrollTop = target;
            expected[side] = Math.abs(element.scrollTop - before) < 1 ? null : element.scrollTop;
        };

        const onEditorScroll = () => {
            if (expected.editor !== null && Math.abs(area.scrollTop - expected.editor) < 2) {
                expected.editor = null;
                return;
            }
            const rows = lineTops();
            const reach = area.scrollHeight - area.clientHeight;
            const reachPane = pane.scrollHeight - pane.clientHeight;
            if (!rows || reach <= 0) {
                if (reach > 0) move(pane, "preview", (area.scrollTop / reach) * reachPane);
                return;
            }
            let row = 0;
            while (row < rows.length - 1 && rows[row + 1] <= area.scrollTop) row++;
            const height = (rows[row + 1] ?? area.scrollHeight) - rows[row];
            const line = row + 1 + (height > 0 ? (area.scrollTop - rows[row]) / height : 0);
            const scale = scales(rows);
            move(pane, "preview", interpolate(line, scale.line, scale.top));
        };

        const onPreviewScroll = () => {
            if (expected.preview !== null && Math.abs(pane.scrollTop - expected.preview) < 2) {
                expected.preview = null;
                return;
            }
            const rows = lineTops();
            const reach = area.scrollHeight - area.clientHeight;
            const reachPane = pane.scrollHeight - pane.clientHeight;
            if (!rows) {
                if (reachPane > 0) move(area, "editor", (pane.scrollTop / reachPane) * reach);
                return;
            }
            const scale = scales(rows);
            const line = interpolate(pane.scrollTop, scale.top, scale.line);
            const row = Math.min(Math.max(Math.floor(line) - 1, 0), rows.length - 1);
            const height = (rows[row + 1] ?? area.scrollHeight) - rows[row];
            move(area, "editor", rows[row] + (line - 1 - row) * height);
        };

        const invalidate = () => {
            tops = undefined;
            anchors = undefined;
        };

        area.addEventListener("scroll", onEditorScroll, { passive: true });
        pane.addEventListener("scroll", onPreviewScroll, { passive: true });
        const observer = new ResizeObserver(invalidate);
        observer.observe(area);
        observer.observe(pane);
        return () => {
            area.removeEventListener("scroll", onEditorScroll);
            pane.removeEventListener("scroll", onPreviewScroll);
            observer.disconnect();
        };
    }, [editor, preview, enabled, version]);
}
