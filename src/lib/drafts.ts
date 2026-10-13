import type { ReadmeDoc } from "@/types/readme";

const PREFIX = "peek.draft.";

// Older drafts are dropped beyond this many, to stay well within the storage quota
const MAX_DRAFTS = 10;

interface Draft {
    text: string;
    at: number;
}

/**
 * Reads the draft kept for a document.
 *
 * @param key - Identity of the document, see draftKey
 * @returns The draft text, or null when none was kept or storage is unavailable
 */
export function readDraft(key: string): string | null {
    try {
        const raw = window.localStorage.getItem(PREFIX + key);
        const draft = raw ? (JSON.parse(raw) as Partial<Draft>) : null;
        return typeof draft?.text === "string" ? draft.text : null;
    } catch {
        return null;
    }
}

/**
 * Removes the draft kept for a document.
 *
 * @param key - Identity of the document, see draftKey
 */
export function removeDraft(key: string) {
    try {
        window.localStorage.removeItem(PREFIX + key);
    } catch {
        // Nothing was kept, or storage is unavailable
    }
}

/**
 * Drops the oldest drafts beyond the limit.
 *
 * @param keep - Key of the draft just written, never dropped
 */
function prune(keep: string) {
    const drafts: { storageKey: string; at: number }[] = [];
    for (let index = 0; index < window.localStorage.length; index++) {
        const storageKey = window.localStorage.key(index);
        if (!storageKey?.startsWith(PREFIX) || storageKey === PREFIX + keep) continue;
        try {
            const draft = JSON.parse(
                window.localStorage.getItem(storageKey) ?? "",
            ) as Partial<Draft>;
            drafts.push({ storageKey, at: typeof draft.at === "number" ? draft.at : 0 });
        } catch {
            drafts.push({ storageKey, at: 0 });
        }
    }
    drafts.sort((a, b) => a.at - b.at);
    for (const { storageKey } of drafts.slice(0, Math.max(0, drafts.length - (MAX_DRAFTS - 1)))) {
        window.localStorage.removeItem(storageKey);
    }
}

/**
 * Keeps the draft of a document, replacing the previous one.
 *
 * @param key - Identity of the document, see draftKey
 * @param text - Current text of the document
 * @returns False when the browser refused to store it (quota, private mode)
 */
export function writeDraft(key: string, text: string): boolean {
    try {
        const draft: Draft = { text, at: Date.now() };
        window.localStorage.setItem(PREFIX + key, JSON.stringify(draft));
        prune(key);
        return true;
    } catch {
        return false;
    }
}

/**
 * Identity under which the draft of a document is kept: a remote document by
 * the link it was opened from, a local file by its name, and pasted text in a
 * single shared slot.
 *
 * @param doc - Document being edited
 * @returns A stable key, unique per remote link and per file name
 */
export function draftKey(doc: ReadmeDoc): string {
    if (doc.source) return `url:${doc.source.input}`;
    return doc.kind === "file" ? `file:${doc.name}` : "text";
}
