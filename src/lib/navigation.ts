// history.pushState fires no event, so in-app navigations announce themselves with this one
export const NAVIGATE_EVENT = "peek:navigate";

/**
 * Navigates within the single page by changing the query string, without a
 * reload, and notifies the location subscribers.
 *
 * @param search - New query string and optional hash ("?url=...#part"), or "" for home
 */
export function navigate(search: string) {
    const target = search ? `${window.location.pathname}${search}` : window.location.pathname;
    window.history.pushState(null, "", target);
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

/**
 * Builds the shareable query string of a remote document.
 *
 * @param input - Link as the user typed it, trimmed here
 * @param flavor - Flavor to embed, omitted when the document uses the default one
 * @returns The query string, starting with "?"
 */
export function shareQuery(input: string, flavor?: string): string {
    const params = new URLSearchParams({ url: input.trim() });
    if (flavor) params.set("flavor", flavor);
    return `?${params.toString()}`;
}

/**
 * Carries the flavor of the current address over to an in-app link, so
 * following a link from a shared GitLab or Obsidian document keeps its flavor.
 *
 * @param search - Target query string and optional hash, as found in a `?url=` link
 * @returns The same target, with the current flavor added when it set none
 */
export function keepFlavor(search: string): string {
    const flavor = new URLSearchParams(window.location.search).get("flavor");
    const [query, hash = ""] = search.split("#");
    const params = new URLSearchParams(query);
    if (!flavor || params.has("flavor")) return search;
    params.set("flavor", flavor);
    return `?${params.toString()}${hash ? `#${hash}` : ""}`;
}

/**
 * Drops the fragment from the address bar, so a section hash of one local
 * document does not scroll the next one.
 */
export function clearHash() {
    if (!window.location.hash) return;
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}`);
}

/**
 * Finds the element an in-document anchor points to. Rendered ids carry the
 * "user-content-" prefix, as on GitHub, so the prefixed form wins over the
 * literal one, which could be an id of the app itself; raw HTML anchors may
 * use name instead of id.
 *
 * @param hash - Fragment with or without its leading "#", possibly percent-encoded
 * @returns The target element, or null when nothing matches
 */
export function findAnchor(hash: string): HTMLElement | null {
    const raw = hash.replace(/^#/, "");
    if (!raw) return null;

    let id: string;
    try {
        id = decodeURIComponent(raw);
    } catch {
        id = raw;
    }

    return (
        document.getElementById(`user-content-${id}`) ??
        document.getElementsByName(`user-content-${id}`)[0] ??
        document.getElementById(id) ??
        null
    );
}

/**
 * Scrolls to an in-document anchor and moves keyboard focus there, as a
 * native jump would; smooth unless the user asked for reduced motion.
 *
 * @param hash - Fragment with or without its leading "#", possibly percent-encoded
 * @returns True when a target was found
 */
export function scrollToAnchor(hash: string): boolean {
    const target = findAnchor(hash);
    if (!target) return false;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    return true;
}

/**
 * Turns a heading id into the fragment shown in links and in the address
 * bar, without the "user-content-" prefix, as GitHub does.
 *
 * @param id - Rendered heading id
 * @returns The fragment, without its leading "#"
 */
export function fragmentOf(id: string): string {
    return id.replace(/^user-content-/, "");
}
