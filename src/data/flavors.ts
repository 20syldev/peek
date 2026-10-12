import type { Flavor } from "@/types/readme";

export interface FlavorInfo {
    id: Flavor;
    label: string;
    summary: string;
}

export const DEFAULT_FLAVOR: Flavor = "github";

// Order of the flavor pills
export const FLAVORS: FlavorInfo[] = [
    { id: "github", label: "GitHub", summary: "Alertes, formules, Mermaid, emojis" },
    { id: "gitlab", label: "GitLab", summary: "Sommaire [[_TOC_]], citations >>>, diff en ligne" },
    { id: "obsidian", label: "Obsidian", summary: "Callouts, liens wiki, ==surlignage==, #tags" },
    { id: "commonmark", label: "CommonMark", summary: "La norme seule, sans extension" },
];
