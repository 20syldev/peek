import { type RefObject, useEffect, useEffectEvent, useState } from "react";

import { RAIL_WIDTHS, type RailWidth } from "@/data/rail";
import type { Heading } from "@/types/readme";

const STEPS = Object.keys(RAIL_WIDTHS) as RailWidth[];

// A link taller than one line by this factor has wrapped
const WRAP_RATIO = 1.3;

/**
 * Tells whether any outline entry runs over more than one line.
 *
 * @param rail - The outline rail, laid out and visible
 * @returns True when at least one entry wrapped
 */
function wraps(rail: HTMLElement): boolean {
    for (const link of rail.querySelectorAll("a")) {
        const style = getComputedStyle(link);
        const line =
            parseFloat(style.lineHeight) +
            parseFloat(style.paddingTop) +
            parseFloat(style.paddingBottom);
        if (link.getBoundingClientRect().height > line * WRAP_RATIO) return true;
    }
    return false;
}

/**
 * Width of the outline rail, fitted to the document: it starts narrow and
 * steps up while a heading wraps onto a second line, up to the widest step.
 * A new document starts over, and the rail is measured again whenever it
 * changes size, notably when it becomes visible, since it is hidden on small
 * screens.
 *
 * @param rail - Ref to the rail element, once it is rendered
 * @param headings - Headings of the document, a new array meaning a new document
 * @param shown - Whether the rail is rendered at all
 * @returns The width step to give the rail
 */
export function useRailFit(
    rail: RefObject<HTMLElement | null>,
    headings: Heading[],
    shown: boolean,
): RailWidth {
    const [fit, setFit] = useState({ headings, step: 0 });
    const step = fit.headings === headings ? fit.step : 0;

    const grow = useEffectEvent(() => {
        const element = rail.current;
        if (!element || element.offsetParent === null || step >= STEPS.length - 1) return;
        if (wraps(element)) setFit({ headings, step: step + 1 });
    });

    useEffect(() => {
        const element = rail.current;
        if (!shown || !element) return;
        // Observing reports the first size before the paint, and again after every width change
        const observer = new ResizeObserver(() => grow());
        observer.observe(element);
        return () => observer.disconnect();
    }, [rail, headings, shown]);

    return STEPS[step];
}
