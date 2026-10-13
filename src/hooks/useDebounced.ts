import { useEffect, useState } from "react";

/**
 * Follows a value with a delay, so something costly that depends on it, such
 * as a rendering, runs once typing pauses instead of on every keystroke.
 *
 * @param value - The latest value
 * @param delay - Quiet time before the value is taken over, in milliseconds
 * @param key - What the value belongs to: when it changes, the new value is taken over at once
 * @returns The value as it was at least delay milliseconds ago, within the same key
 */
export function useDebounced<T>(value: T, delay: number, key: unknown = null): T {
    const [state, setState] = useState({ key, value });
    const current = state.key === key;

    useEffect(() => {
        const timer = window.setTimeout(() => setState({ key, value }), current ? delay : 0);
        return () => window.clearTimeout(timer);
    }, [key, value, delay, current]);

    return current ? state.value : value;
}
