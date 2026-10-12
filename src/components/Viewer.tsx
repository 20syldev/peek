"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { DropOverlay } from "@/components/DropOverlay";
import { Picker } from "@/components/Picker";
import { ReaderSkeleton } from "@/components/reader/ReaderSkeleton";
import { Settings } from "@/components/Settings";
import { ShortcutsDialog } from "@/components/ShortcutsDialog";
import { THEME_COLORS } from "@/data/theme";
import { useFileDrop } from "@/hooks/useFileDrop";
import { useLocaleSwitch } from "@/hooks/useLocaleSwitch";
import { useReadme } from "@/hooks/useReadme";
import { usePaste, useShortcuts } from "@/hooks/useShortcuts";
import { warmUpWorker } from "@/lib/markdown/render";

/**
 * Reader loaded on demand, client-only, showing the skeleton while its chunk
 * downloads; Markdown itself renders in the background worker.
 */
const Reader = dynamic(() => import("@/components/reader/Reader").then((mod) => mod.Reader), {
    ssr: false,
    loading: () => <ReaderSkeleton />,
});

const ACCEPT = ".md,.markdown,.mdown,.mkdn,.mkd,.mdx,.txt,text/markdown,text/plain";

/**
 * Whole app: the settings pill, the home picker or the reader, and the
 * page-wide behaviors (shortcuts, paste, drop anywhere, title, focus). Closing
 * a document, or a rejected link, hands focus back to the link field, except on
 * touch screens where it would open the keyboard.
 */
export function Viewer() {
    const t = useTranslations("reader");
    const { view, notice, dismiss, openUrl, openFile, openText, paste, close } = useReadme();
    const { cycle } = useLocaleSwitch();
    const homeTitle = useRef<string | null>(null);
    const { resolvedTheme, setTheme } = useTheme();
    const [help, setHelp] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const urlInput = useRef<HTMLInputElement>(null);
    const wasReading = useRef(false);
    const dragging = useFileDrop(openFile);
    const reading = view.status === "ready";
    const docName = view.status === "ready" ? view.doc.name : null;

    useShortcuts({
        help: () => setHelp((open) => !open),
        theme: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
        locale: cycle,
        open: () => fileInput.current?.click(),
        focusUrl: view.status === "idle" ? () => urlInput.current?.focus() : undefined,
    });
    usePaste(openFile, paste);

    useEffect(() => {
        homeTitle.current ??= document.title;
        document.title = docName ? `${docName} - Peek` : homeTitle.current;
    }, [docName]);

    const idleError = view.status === "idle" ? view.error : undefined;

    useEffect(() => {
        const closed = wasReading.current && !reading;
        wasReading.current = reading;
        if (!closed && !idleError) return;
        if (window.matchMedia("(pointer: fine)").matches) urlInput.current?.focus();
    }, [reading, idleError]);

    useEffect(() => {
        const color = resolvedTheme ? THEME_COLORS[resolvedTheme] : undefined;
        if (!color) return;
        document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
            meta.setAttribute("content", color);
        });
    }, [resolvedTheme]);

    useEffect(() => {
        void import("@/components/reader/Reader");
        warmUpWorker();
    }, []);

    return (
        <div className="flex min-h-dvh flex-col bg-dots print:bg-none">
            <Settings onShortcuts={() => setHelp(true)} />

            {view.status === "ready" ? (
                <Reader doc={view.doc} notice={notice} onDismiss={dismiss} onClose={close} />
            ) : view.status === "loading" ? (
                <ReaderSkeleton name={view.name} />
            ) : (
                <Picker
                    error={view.error}
                    input={view.input}
                    dragging={dragging}
                    urlRef={urlInput}
                    onBrowse={() => fileInput.current?.click()}
                    onUrl={openUrl}
                    onText={openText}
                />
            )}

            {dragging && reading ? <DropOverlay /> : null}
            <ShortcutsDialog open={help} onOpenChange={setHelp} />
            <p role="status" className="sr-only">
                {view.status === "loading" ? t("announce") : ""}
            </p>
            <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void openFile(file);
                    event.target.value = "";
                }}
            />
        </div>
    );
}
