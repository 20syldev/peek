// Where a rendered document came from
export type ReadmeKind = "file" | "url" | "text";

// Markdown dialect the renderer follows
export type Flavor = "github" | "gitlab" | "obsidian" | "commonmark";

export interface RemoteSource {
    input: string;
    url: string;
    page: string;
    crumbs: string[];
    name: string;
    root?: string;
    alternatives?: RemoteSource[];
}

export interface ReadmeDoc {
    kind: ReadmeKind;
    content: string;
    name: string;
    crumbs: string[];
    source?: RemoteSource;
}

export interface Heading {
    id: string;
    text: string;
    level: number;
}
