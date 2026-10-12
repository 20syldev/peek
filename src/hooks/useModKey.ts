import { useSyncExternalStore } from "react";

/**
 * The platform never changes during a visit, so there is nothing to observe.
 *
 * @returns A no-op unsubscribe function
 */
function subscribe() {
    return () => {};
}

/**
 * Reads the platform from the browser.
 *
 * @returns "Cmd" on Apple platforms, "Ctrl" elsewhere
 */
function getSnapshot() {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "Cmd" : "Ctrl";
}

/**
 * The static HTML is rendered for the most common platform.
 *
 * @returns "Ctrl"
 */
function getServerSnapshot() {
    return "Ctrl";
}

/**
 * Label of the shortcut modifier key for the current platform.
 *
 * @returns "Cmd" on Apple platforms, "Ctrl" elsewhere
 */
export function useModKey(): string {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
