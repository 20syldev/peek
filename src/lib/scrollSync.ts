// Past this many lines, measuring each one costs more than it brings: scroll in proportion instead
const MAX_LINES = 20000;

export interface Anchor {
    line: number;
    top: number;
}

/**
 * Measures where each source line starts in a text area, wrapped lines
 * included, by laying the same text out in an invisible copy of it.
 *
 * @param area - The text area to measure
 * @returns The top of every line in scroll coordinates, or null for a text too long to measure
 */
export function measureLines(area: HTMLTextAreaElement): number[] | null {
    const lines = area.value.split("\n");
    if (lines.length > MAX_LINES) return null;

    const style = getComputedStyle(area);
    const mirror = document.createElement("div");
    mirror.setAttribute("aria-hidden", "true");
    Object.assign(mirror.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        top: "0",
        left: "-9999px",
        boxSizing: "border-box",
        width: `${area.clientWidth}px`,
        padding: style.padding,
        font: style.font,
        letterSpacing: style.letterSpacing,
        lineHeight: style.lineHeight,
        tabSize: style.tabSize,
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
    });
    for (const line of lines) {
        const row = document.createElement("div");
        row.textContent = line === "" ? " " : line;
        mirror.append(row);
    }
    document.body.append(mirror);
    const tops = Array.from(mirror.children, (row) => (row as HTMLElement).offsetTop);
    mirror.remove();
    return tops;
}

/**
 * Finds where the top blocks of a rendered document start, from the source
 * line each one carries.
 *
 * @param container - The scrolling element holding the rendered document
 * @returns The blocks in document order, with their top in scroll coordinates
 */
export function measureBlocks(container: HTMLElement): Anchor[] {
    const origin = container.getBoundingClientRect().top - container.scrollTop;
    const anchors: Anchor[] = [];
    for (const block of container.querySelectorAll<HTMLElement>("[data-line]")) {
        const line = Number(block.dataset.line);
        if (Number.isFinite(line)) {
            anchors.push({ line, top: block.getBoundingClientRect().top - origin });
        }
    }
    return anchors;
}

/**
 * Maps a position between two scales that share anchor points, interpolating
 * inside the segment that holds it.
 *
 * @param value - Position on the source scale
 * @param from - Anchor positions on the source scale, ascending
 * @param to - The same anchors on the target scale
 * @returns The matching position on the target scale
 */
export function interpolate(value: number, from: number[], to: number[]): number {
    let index = 0;
    while (index < from.length - 2 && from[index + 1] <= value) index++;
    const span = from[index + 1] - from[index];
    if (span <= 0) return to[index];
    return to[index] + ((value - from[index]) / span) * (to[index + 1] - to[index]);
}
