export type ShortcutId =
    | "open"
    | "paste"
    | "focusUrl"
    | "outline"
    | "copyLink"
    | "raw"
    | "edit"
    | "save"
    | "theme"
    | "locale"
    | "close"
    | "help"
    | "submitText"
    | "print";

export type ShortcutScope = "global" | "home" | "document";

export interface Shortcut {
    id: ShortcutId;
    key: string;
    alt?: string;
    mod?: boolean;
    scope: ShortcutScope;
    passive?: boolean;
}

// Single keys only fire outside text fields, like GitHub's own shortcuts
export const SHORTCUTS: Shortcut[] = [
    // ":" shares its key with "/" on AZERTY, where Ctrl + "/" would need Shift
    {
        id: "help",
        key: "/",
        alt: ":",
        mod: true,
        scope: "global",
    },
    { id: "theme", key: "d", scope: "global" },
    { id: "locale", key: "l", scope: "global" },
    { id: "open", key: "o", mod: true, scope: "global" },
    {
        id: "paste",
        key: "v",
        mod: true,
        scope: "global",
        passive: true,
    },
    { id: "focusUrl", key: "/", scope: "home" },
    {
        id: "submitText",
        key: "Enter",
        mod: true,
        scope: "home",
        passive: true,
    },
    { id: "outline", key: "s", scope: "document" },
    { id: "copyLink", key: "c", scope: "document" },
    { id: "raw", key: "r", scope: "document" },
    { id: "edit", key: "e", scope: "document" },
    { id: "save", key: "s", mod: true, scope: "document" },
    { id: "close", key: "Escape", scope: "document" },
    {
        id: "print",
        key: "p",
        mod: true,
        scope: "document",
        passive: true,
    },
];
