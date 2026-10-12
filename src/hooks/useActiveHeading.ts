import { useEffect, useState } from "react";

import { findAnchor } from "@/lib/navigation";
import type { Heading } from "@/types/readme";

/**
 * Tracks the heading the reader is currently in, for the outline highlight.
 * The active heading is the last one whose top crossed the upper fifth of
 * the viewport; it is recomputed at most once per frame while scrolling.
 *
 * @param headings - Document headings, in order
 * @returns The id of the active heading, or null above the first one
 */
export function useActiveHeading(headings: Heading[]): string | null {
    const [active, setActive] = useState<string | null>(null);

    useEffect(() => {
        const elements = headings
            .map((heading) => findAnchor(heading.id))
            .filter((element): element is HTMLElement => element !== null);
        if (elements.length === 0) return;

        let frame = 0;
        const update = () => {
            frame = 0;
            const limit = window.innerHeight * 0.2;
            let current: string | null = null;
            for (const element of elements) {
                if (element.getBoundingClientRect().top > limit) break;
                current = element.id;
            }
            setActive(current);
        };
        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };

        window.addEventListener("scroll", schedule, { passive: true });
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("scroll", schedule);
        };
    }, [headings]);

    return active;
}
