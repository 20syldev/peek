import { useCallback } from "react";

import { DEFAULT_FLAVOR, FLAVORS } from "@/data/flavors";
import { useLocationSearch } from "@/hooks/useLocationSearch";
import { usePreference } from "@/hooks/usePreference";
import { NAVIGATE_EVENT } from "@/lib/navigation";
import type { Flavor } from "@/types/readme";

const STORAGE_KEY = "peek.flavor";

/**
 * Narrows an arbitrary value to a known flavor id.
 *
 * @param value - Value read from storage or from the query string
 * @returns True for one of the flavors offered in the reader
 */
function isFlavor(value: unknown): value is Flavor {
    return FLAVORS.some((flavor) => flavor.id === value);
}

/**
 * Markdown flavor of the reader. A `flavor` query parameter (shared link)
 * wins over the preference remembered in this browser; choosing a flavor
 * updates both, so the address bar stays shareable.
 *
 * @returns The active flavor and its setter
 */
export function useFlavor(): [Flavor, (flavor: Flavor) => void] {
    const [stored, store] = usePreference(STORAGE_KEY);
    const search = useLocationSearch();
    const param = new URLSearchParams(search).get("flavor");
    const flavor = isFlavor(param) ? param : isFlavor(stored) ? stored : DEFAULT_FLAVOR;

    const setFlavor = useCallback(
        (next: Flavor) => {
            store(next);

            const params = new URLSearchParams(window.location.search);
            if (!params.has("url") && !params.has("flavor")) return;
            if (next === DEFAULT_FLAVOR) params.delete("flavor");
            else params.set("flavor", next);
            const query = params.toString();
            const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
            window.history.replaceState(null, "", url);
            window.dispatchEvent(new Event(NAVIGATE_EVENT));
        },
        [store],
    );

    return [flavor, setFlavor];
}
