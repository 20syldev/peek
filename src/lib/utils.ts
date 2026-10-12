import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class lists, letting later utilities override conflicting ones.
 *
 * @param inputs - Class values in any shape accepted by clsx (strings, arrays, conditional maps)
 * @returns A single deduplicated class string
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Drops the hast node that the Markdown renderer passes to custom components,
 * so it never reaches the DOM as an attribute.
 *
 * @param props - Props received by a component of the Markdown component map
 * @returns The same props without `node`
 */
export function domProps<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
    const rest = { ...props };
    delete rest.node;
    return rest;
}
