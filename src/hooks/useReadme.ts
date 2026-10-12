import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocationSearch } from "@/hooks/useLocationSearch";
import { fetchSource, readMarkdownFile } from "@/lib/load";
import { clearHash, keepFlavor, navigate, shareQuery } from "@/lib/navigation";
import { resolveSource, SourceError, type SourceErrorCode } from "@/lib/source";
import type { ReadmeDoc, RemoteSource } from "@/types/readme";

export type ReadmeView =
    | { status: "idle"; error?: string; input?: string }
    | { status: "loading"; input: string; name?: string }
    | { status: "ready"; doc: ReadmeDoc };

interface Failure {
    code: SourceErrorCode | "unexpected";
    values: Record<string, string | number>;
}

interface Outcome {
    doc?: ReadmeDoc;
    error?: Failure;
}

interface Notice {
    failure: Failure;
    input?: string;
}

// Links that the paste shortcut opens instead of rendering as text
const LINK = /^(https?:\/\/|(www\.)?github\.com\/|gist\.github\.com\/)\S+$/i;

/**
 * Describes a failure by its code, to be turned into a sentence once the
 * language is at hand.
 *
 * @param error - Anything thrown while resolving, reading or fetching
 * @returns The code and values of a SourceError, or a generic code for unexpected errors
 */
function failureOf(error: unknown): Failure {
    if (error instanceof SourceError) return { code: error.code, values: error.values };
    return { code: "unexpected", values: {} };
}

/**
 * Resolves a link without throwing.
 *
 * @param input - Value of the `url` query parameter
 * @returns The source, or the reason it cannot be loaded
 */
function tryResolve(input: string): { source?: RemoteSource; error?: Failure } {
    try {
        return { source: resolveSource(input) };
    } catch (error) {
        return { error: failureOf(error) };
    }
}

/**
 * Document state of the viewer. Remote documents follow the `url` query
 * parameter (shareable, cached for the visit), files and pasted text live in
 * local state, and a rejected input raises a notice instead of replacing them.
 *
 * @returns The view, the pending notice and the actions that change them
 */
export function useReadme() {
    const t = useTranslations();
    const search = useLocationSearch();
    const input = useMemo(() => new URLSearchParams(search).get("url"), [search]);
    const resolved = useMemo(() => (input === null ? null : tryResolve(input)), [input]);
    const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
    const [local, setLocal] = useState<ReadmeDoc | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null);
    const outcome = input === null ? undefined : outcomes[input];

    useEffect(() => {
        const source = resolved?.source;
        if (!source || outcome) return;

        const controller = new AbortController();
        fetchSource(source, controller.signal).then(
            ({ content, source: found }) => {
                const doc: ReadmeDoc = {
                    kind: "url",
                    content,
                    name: found.name,
                    crumbs: found.crumbs,
                    source: found,
                };
                setOutcomes((previous) => ({ ...previous, [source.input]: { doc } }));
            },
            (error: unknown) => {
                if (controller.signal.aborted) return;
                const failure = { error: failureOf(error) };
                setOutcomes((previous) => ({ ...previous, [source.input]: failure }));
            },
        );
        return () => controller.abort();
    }, [resolved, outcome]);

    const describe = (failure?: Failure) =>
        failure ? t(`errors.${failure.code}`, failure.values) : undefined;

    let view: ReadmeView;
    if (input !== null) {
        if (resolved?.error) view = { status: "idle", error: describe(resolved.error), input };
        else if (!outcome) view = { status: "loading", input, name: resolved?.source?.name };
        else if (outcome.doc) view = { status: "ready", doc: outcome.doc };
        else view = { status: "idle", error: describe(outcome.error), input };
    } else if (local) {
        view = { status: "ready", doc: local };
    } else {
        view = { status: "idle", error: describe(notice?.failure), input: notice?.input };
    }
    const reading = view.status === "ready";

    const fail = useCallback(
        (failure: Failure, failed?: string) => {
            // A failed link hides the home screen where the notice shows; a loading one is left alone
            if (view.status === "idle" && input !== null) navigate("");
            setNotice({ failure, input: failed });
        },
        [input, view.status],
    );

    const showLocal = useCallback(
        (doc: ReadmeDoc) => {
            if (input !== null) navigate("");
            clearHash();
            setNotice(null);
            setLocal(doc);
        },
        [input],
    );

    const openUrl = useCallback(
        (text: string) => {
            const value = text.trim();
            const check = tryResolve(value);
            if (check.error) return fail(check.error, value);

            setNotice(null);
            setLocal(null);
            setOutcomes((previous) => {
                if (!previous[value]?.error) return previous;
                const next = { ...previous };
                delete next[value];
                return next;
            });
            navigate(keepFlavor(shareQuery(value)));
        },
        [fail],
    );

    const openFile = useCallback(
        async (file: File) => {
            try {
                const content = await readMarkdownFile(file);
                showLocal({ kind: "file", content, name: file.name, crumbs: [] });
            } catch (error) {
                fail(failureOf(error));
            }
        },
        [fail, showLocal],
    );

    const openText = useCallback(
        (text: string) => {
            if (!text.trim()) return;
            showLocal({ kind: "text", content: text, name: t("pastedText"), crumbs: [] });
        },
        [showLocal, t],
    );

    const paste = useCallback(
        (text: string) => {
            if (LINK.test(text.trim())) openUrl(text);
            else openText(text);
        },
        [openText, openUrl],
    );

    const close = useCallback(() => {
        setLocal(null);
        setNotice(null);
        clearHash();
        if (input !== null) navigate("");
    }, [input]);

    const dismiss = useCallback(() => setNotice(null), []);

    return {
        view,
        notice: reading ? describe(notice?.failure) : undefined,
        dismiss,
        openUrl,
        openFile,
        openText,
        paste,
        close,
    };
}
