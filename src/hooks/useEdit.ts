import { useCallback, useEffect, useEffectEvent, useMemo, useState } from "react";

import { useDebounced } from "@/hooks/useDebounced";
import { useSave } from "@/hooks/useSave";
import { draftKey, readDraft, removeDraft, writeDraft } from "@/lib/drafts";
import type { ReadmeDoc } from "@/types/readme";

/**
 * How long typing must pause before the draft is kept, in milliseconds.
 */
const DRAFT_DELAY = 500;

/**
 * Edits of one document: the working text, the text last saved, and whether
 * the editor is open. They belong to the document they were made on.
 */
interface Session {
    doc: ReadmeDoc;
    text: string;
    saved: string;
    editing: boolean;
}

/**
 * Editing of a document: the working text, whether the editor is open, the
 * unsaved state, saving, and the draft kept in this browser. Text areas
 * report line breaks as "\n", so a CRLF document is edited with "\n" and
 * written back with its own line breaks. The draft is the difference from the
 * document as it was opened: it follows the typing, goes away when the text
 * is back to the original or after saving in place, and is offered again when
 * the same document is opened later.
 *
 * @param doc - Document on screen; a new one starts from its own text
 * @returns The text to show, the editor state, and the actions that change them
 */
export function useEdit(doc: ReadmeDoc) {
    const [session, setSession] = useState<Session | null>(null);
    const [answered, setAnswered] = useState<ReadmeDoc | null>(null);
    const { status: saveStatus, save } = useSave(doc);

    const current = session?.doc === doc ? session : null;
    const original = useMemo(() => doc.content.replace(/\r\n/g, "\n"), [doc]);
    const eol = doc.content.includes("\r\n") ? "\r\n" : "\n";
    const key = draftKey(doc);
    const content = current?.text ?? doc.content;
    const editing = current?.editing ?? false;
    const dirty = current !== null && current.text !== current.saved;

    // A draft left by an earlier visit, offered until it is taken or dropped
    const kept = useMemo(() => readDraft(key), [key]);
    const draft = !current && answered !== doc && kept !== null && kept !== original ? kept : null;

    const text = current?.text ?? null;
    const persisted = useDebounced(text, DRAFT_DELAY, doc);
    useEffect(() => {
        if (persisted === null) return;
        if (persisted === original) removeDraft(key);
        else writeDraft(key, persisted);
    }, [persisted, original, key]);

    const flush = useEffectEvent(() => {
        if (text === null) return;
        if (text === original) removeDraft(key);
        else writeDraft(key, text);
    });
    useEffect(() => {
        const onHide = () => {
            if (document.visibilityState === "hidden") flush();
        };
        document.addEventListener("visibilitychange", onHide);
        window.addEventListener("pagehide", flush);
        return () => {
            document.removeEventListener("visibilitychange", onHide);
            window.removeEventListener("pagehide", flush);
        };
    }, []);

    const toggle = useCallback(() => {
        setSession((previous) => {
            const own = previous?.doc === doc ? previous : null;
            const base = own ?? { doc, text: original, saved: original, editing: false };
            return { ...base, editing: !base.editing };
        });
    }, [doc, original]);

    const change = useCallback(
        (next: string) => {
            setSession((previous) =>
                previous?.doc === doc ? { ...previous, text: next } : previous,
            );
        },
        [doc],
    );

    const saveDocument = useCallback(async () => {
        const written = content.replace(/\r?\n/g, eol);
        const kind = await save(written);
        if (!kind) return;
        const text = written.replace(/\r\n/g, "\n");
        if (kind === "file") removeDraft(key);
        setSession((previous) => (previous?.doc === doc ? { ...previous, saved: text } : previous));
    }, [content, eol, save, key, doc]);

    const resume = useCallback(() => {
        if (draft === null) return;
        setSession({ doc, text: draft, saved: original, editing: true });
    }, [doc, draft, original]);

    const drop = useCallback(() => {
        removeDraft(key);
        setAnswered(doc);
    }, [key, doc]);

    return {
        content,
        editing,
        dirty,
        draft,
        saveStatus,
        toggle,
        change,
        save: saveDocument,
        resume,
        drop,
    };
}
