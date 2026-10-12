import { useSyncExternalStore } from "react";

import { NAVIGATE_EVENT } from "@/lib/navigation";

/**
 * Subscribes to browser history moves and in-app navigations.
 *
 * @param onChange - Called whenever the query string may have changed
 * @returns The unsubscribe function
 */
function subscribe(onChange: () => void) {
    window.addEventListener("popstate", onChange);
    window.addEventListener(NAVIGATE_EVENT, onChange);
    return () => {
        window.removeEventListener("popstate", onChange);
        window.removeEventListener(NAVIGATE_EVENT, onChange);
    };
}

/**
 * Reads the current query string.
 *
 * @returns window.location.search, "" when empty
 */
function getSnapshot() {
    return window.location.search;
}

/**
 * Static export has no query string at build time.
 *
 * @returns An empty query string
 */
function getServerSnapshot() {
    return "";
}

/**
 * Current query string, kept in sync with back/forward and in-app navigation.
 * The static HTML renders with an empty one, then hydration picks up the real
 * value, so shared links never cause a hydration mismatch.
 *
 * @returns The query string, starting with "?" when not empty
 */
export function useLocationSearch(): string {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
