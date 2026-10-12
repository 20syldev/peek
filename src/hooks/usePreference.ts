import { useCallback, useSyncExternalStore } from "react";

const CHANGE_EVENT = "peek:preference";

// Fallback when localStorage throws (private mode, blocked site data): lasts for the visit
const memory = new Map<string, string>();

/**
 * Subscribes to preference changes from this tab and from other tabs.
 *
 * @param onChange - Called when any stored preference may have changed
 * @returns The unsubscribe function
 */
function subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(CHANGE_EVENT, onChange);
    };
}

/**
 * Reads a preference, from localStorage or from the in-memory fallback.
 *
 * @param key - Storage key, namespaced with "peek."
 * @returns The stored string, or null when nothing was saved
 */
function read(key: string): string | null {
    try {
        return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
    } catch {
        return memory.get(key) ?? null;
    }
}

/**
 * The server render never sees stored preferences.
 *
 * @returns Null, which usePreference reports as an unset preference
 */
function getServerSnapshot() {
    return null;
}

/**
 * Per-browser preference kept in localStorage, shared by every component
 * that reads the same key and synced across tabs.
 *
 * @param key - Storage key, namespaced with "peek."
 * @returns The stored value (null when unset, and during the server render) and its setter
 */
export function usePreference(key: string): [string | null, (value: string) => void] {
    const value = useSyncExternalStore(subscribe, () => read(key), getServerSnapshot);

    const setValue = useCallback(
        (next: string) => {
            try {
                window.localStorage.setItem(key, next);
            } catch {
                memory.set(key, next);
            }
            window.dispatchEvent(new Event(CHANGE_EVENT));
        },
        [key],
    );

    return [value, setValue];
}
