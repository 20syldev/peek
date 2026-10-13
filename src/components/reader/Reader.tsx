"use client";

import { CircleAlert, History, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Markdown } from "@/components/markdown/Markdown";
import { Pills } from "@/components/Pills";
import { Editor } from "@/components/reader/Editor";
import { Outline } from "@/components/reader/Outline";
import { Toolbar } from "@/components/reader/Toolbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DEFAULT_FLAVOR } from "@/data/flavors";
import { RAIL_WIDTHS } from "@/data/rail";
import { useActiveHeading } from "@/hooks/useActiveHeading";
import { useCopy } from "@/hooks/useCopy";
import { useDebounced } from "@/hooks/useDebounced";
import { useEdit } from "@/hooks/useEdit";
import { useFlavor } from "@/hooks/useFlavor";
import { useRailFit } from "@/hooks/useRailFit";
import { useRendered } from "@/hooks/useRendered";
import { useScrollSync } from "@/hooks/useScrollSync";
import { useShortcuts } from "@/hooks/useShortcuts";
import { scrollToAnchor, shareQuery } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { ReadmeDoc } from "@/types/readme";

/**
 * Tailwind's xl breakpoint, from which the outline rail is visible.
 */
const RAIL_QUERY = "(min-width: 80rem)";

/**
 * How long typing must pause before the preview renders again, in milliseconds.
 */
const PREVIEW_DELAY = 250;

export interface ReaderProps {
    doc: ReadmeDoc;
    notice?: string;
    onDismiss: () => void;
    onClose: () => void;
}

/**
 * Document screen: the rendered sheet under its file tab, the outline rail on
 * wide screens, and the editor, which turns the sheet into a source pane and a
 * live preview that scroll together. Loaded lazily so the home screen stays
 * light; the Markdown toolchain itself runs in the rendering worker. Once per
 * document, when its first rendering lands, it scrolls to the hash or the top
 * and takes focus, unless focus is already in the sheet; a status region
 * announces the outcome, saving included. A draft left by an earlier visit is
 * offered above the toolbar. The outline shortcut scrolls the toolbar into
 * view first, since its popover anchors there.
 */
export function Reader({ doc, notice, onDismiss, onClose }: ReaderProps) {
    const t = useTranslations("reader");
    const errors = useTranslations("errors");
    const [flavor, setFlavor] = useFlavor();
    const [rawDoc, setRawDoc] = useState<ReadmeDoc | null>(null);
    const edit = useEdit(doc);
    const { content, editing, dirty } = edit;
    const raw = rawDoc === doc && !editing;
    const [pane, setPane] = useState<"edit" | "preview">("edit");
    const previewed = useDebounced(content, PREVIEW_DELAY, doc);
    const { rendered, pending, error } = useRendered(doc, flavor, editing ? previewed : content);
    const editor = useRef<HTMLTextAreaElement>(null);
    const preview = useRef<HTMLDivElement>(null);
    useScrollSync(editor, preview, editing, rendered);
    const headings = useMemo(() => rendered?.headings ?? [], [rendered]);
    const active = useActiveHeading(headings);
    const [outlineOpen, setOutlineOpen] = useState(false);
    const { status, copy } = useCopy();
    const sheet = useRef<HTMLElement>(null);
    const toolbar = useRef<HTMLDivElement>(null);
    const rail = useRef<HTMLElement>(null);
    const hasOutline = headings.length > 1 && !raw && !editing;
    const railWidth = useRailFit(rail, headings, hasOutline);
    const announcement =
        edit.saveStatus === "saved"
            ? t("saved")
            : edit.saveStatus === "failed"
              ? t("saveFailed")
              : status === "copied"
                ? t("linkCopied")
                : status === "failed"
                  ? t("copyFailed")
                  : error
                    ? errors("title")
                    : rendered
                      ? t("announceRendered", { name: doc.name })
                      : "";
    const repoIndex = doc.crumbs[0] === "github.com" ? 2 : -1;

    const settled = rendered !== null || error !== undefined;
    const handled = useRef<ReadmeDoc | null>(null);
    useEffect(() => {
        if (!settled || handled.current === doc) return;
        handled.current = doc;
        if (window.location.hash && scrollToAnchor(window.location.hash)) return;
        window.scrollTo(0, 0);
        if (!sheet.current?.contains(document.activeElement)) {
            sheet.current?.focus({ preventScroll: true });
        }
    }, [doc, settled]);

    const copyLink = () => {
        if (!doc.source) return;
        const query = shareQuery(doc.source.input, flavor === DEFAULT_FLAVOR ? undefined : flavor);
        void copy(`${window.location.origin}/${query}`);
    };

    const toggleRaw = () => setRawDoc(raw ? null : doc);

    const toggleEdit = () => {
        setRawDoc(null);
        setPane("edit");
        edit.toggle();
    };

    const showOutline = () => {
        if (window.matchMedia(RAIL_QUERY).matches) {
            rail.current?.querySelector("a")?.focus();
            return;
        }
        toolbar.current?.scrollIntoView({ block: "nearest" });
        setOutlineOpen(true);
    };

    useShortcuts({
        raw: editing ? undefined : toggleRaw,
        edit: toggleEdit,
        save: editing || dirty ? () => void edit.save() : undefined,
        outline: hasOutline ? showOutline : undefined,
        copyLink: doc.source ? copyLink : undefined,
        close: onClose,
    });

    const body = (
        <>
            {doc.crumbs.length > 0 ? (
                <p className="mb-7 flex flex-wrap gap-2 font-mono text-xs text-muted-foreground">
                    {doc.crumbs.map((crumb, index) => (
                        <span key={`${index}-${crumb}`} className="flex gap-2">
                            {index > 0 ? <span aria-hidden="true">/</span> : null}
                            <span className={index === repoIndex ? "text-foreground" : undefined}>
                                {crumb}
                            </span>
                        </span>
                    ))}
                </p>
            ) : null}
            {raw ? (
                <pre
                    tabIndex={0}
                    aria-label={t("rawLabel")}
                    className="m-0 rounded-sm font-mono text-sm leading-relaxed break-words whitespace-pre-wrap outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {content}
                </pre>
            ) : error ? (
                <p className="text-muted-foreground">
                    {error === "timeout" ? t("timeout") : t("unsupported")}
                </p>
            ) : !content.trim() ? (
                <p className="text-muted-foreground">{t("empty")}</p>
            ) : rendered ? (
                <div aria-busy={pending}>
                    <Markdown tree={rendered.tree} />
                </div>
            ) : (
                <div aria-busy="true" className="flex animate-pulse flex-col gap-4">
                    <div className="h-8 w-1/2 rounded-md bg-muted" />
                    <div className="h-4 w-11/12 rounded bg-muted" />
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-9/12 rounded bg-muted" />
                </div>
            )}
        </>
    );

    return (
        <>
            <main
                style={{ "--rail": RAIL_WIDTHS[railWidth] } as React.CSSProperties}
                className={cn(
                    "mx-auto flex w-full flex-1 items-start gap-10 px-3 pt-3 pb-12 sm:px-6 md:pt-16 print:block print:p-0",
                    editing ? "max-w-[90rem]" : "max-w-[calc(56rem_+_var(--rail))]",
                )}
            >
                <div className="min-w-0 flex-1">
                    {notice ? (
                        <Alert
                            variant="destructive"
                            className="mb-4 bg-card pr-12 max-md:mt-12 print:hidden"
                        >
                            <CircleAlert />
                            <AlertTitle>{errors("cannotDisplay")}</AlertTitle>
                            <AlertDescription>{notice}</AlertDescription>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t("dismiss")}
                                onClick={() => {
                                    sheet.current?.focus({ preventScroll: true });
                                    onDismiss();
                                }}
                                className="absolute top-2 right-2 text-muted-foreground"
                            >
                                <X />
                            </Button>
                        </Alert>
                    ) : null}
                    {edit.draft !== null ? (
                        <Alert role="status" className="mb-4 bg-card max-md:mt-12 print:hidden">
                            <History />
                            <AlertTitle>{t("draftTitle")}</AlertTitle>
                            <AlertDescription>
                                {t("draftHint")}
                                <span className="mt-2 flex flex-wrap gap-2">
                                    <Button size="sm" onClick={edit.resume}>
                                        {t("draftResume")}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={edit.drop}>
                                        {t("draftDrop")}
                                    </Button>
                                </span>
                            </AlertDescription>
                        </Alert>
                    ) : null}
                    <Toolbar
                        ref={toolbar}
                        doc={doc}
                        flavor={flavor}
                        onFlavor={setFlavor}
                        raw={raw}
                        onRaw={toggleRaw}
                        editing={editing}
                        onEdit={toggleEdit}
                        dirty={dirty}
                        saveStatus={edit.saveStatus}
                        onSave={() => void edit.save()}
                        headings={headings}
                        active={active}
                        outlineOpen={outlineOpen}
                        onOutlineOpenChange={setOutlineOpen}
                        copy={status}
                        onCopy={copyLink}
                        onClose={onClose}
                    />
                    <article
                        ref={sheet}
                        tabIndex={-1}
                        aria-label={doc.name}
                        className={cn(
                            "rounded-xl rounded-tl-none border bg-card shadow-[0_1px_2px_rgb(0_0_0/4%),0_16px_40px_-24px_rgb(0_0_0/16%)] outline-none print:block print:border-0 print:p-0 print:shadow-none",
                            editing
                                ? "lg:grid lg:h-[calc(100dvh-10.5rem)] lg:min-h-[28rem] lg:grid-cols-2"
                                : "px-5 py-7 sm:px-10 md:py-10 md:pr-14 md:pl-20",
                        )}
                    >
                        {editing ? (
                            <>
                                <div className="flex border-b p-2 lg:hidden print:hidden">
                                    <Pills
                                        label={t("editing")}
                                        options={[
                                            { value: "edit", label: t("edit") },
                                            { value: "preview", label: t("preview") },
                                        ]}
                                        value={pane}
                                        onChange={setPane}
                                    />
                                </div>
                                <div
                                    className={cn(
                                        "lg:block lg:h-full lg:min-h-0 print:hidden",
                                        pane === "edit" ? "block" : "hidden",
                                    )}
                                >
                                    <Editor ref={editor} value={content} onChange={edit.change} />
                                </div>
                                <div
                                    ref={preview}
                                    className={cn(
                                        "min-w-0 px-5 py-7 sm:px-10 lg:block lg:h-full lg:min-h-0 lg:overflow-y-auto lg:border-l lg:py-10 lg:pr-10 lg:pl-20 print:block print:h-auto print:overflow-visible print:border-0 print:p-0",
                                        pane === "preview" ? "block" : "hidden",
                                    )}
                                >
                                    {body}
                                </div>
                            </>
                        ) : (
                            body
                        )}
                    </article>
                </div>

                {hasOutline ? (
                    <aside
                        ref={rail}
                        aria-label={t("outlineRail")}
                        className="sticky top-16 hidden max-h-[calc(100dvh-8rem)] w-(--rail) shrink-0 overflow-y-auto pt-12 xl:block print:hidden"
                    >
                        <p className="mb-3 font-mono text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                            {t("outline")}
                        </p>
                        <Outline headings={headings} active={active} />
                    </aside>
                ) : null}
            </main>
            <span role="status" className="sr-only">
                {announcement}
            </span>
        </>
    );
}
