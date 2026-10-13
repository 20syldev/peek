"use client";

import {
    Check,
    Code,
    ExternalLink,
    FileText,
    Link as LinkIcon,
    ListTree,
    Pencil,
    Save,
    X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Keys } from "@/components/Keys";
import { Pills } from "@/components/Pills";
import { Outline } from "@/components/reader/Outline";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FLAVORS } from "@/data/flavors";
import type { ShortcutId } from "@/data/shortcuts";
import type { CopyStatus } from "@/hooks/useCopy";
import type { SaveStatus } from "@/hooks/useSave";
import { canPickFile } from "@/lib/save";
import type { Flavor, Heading, ReadmeDoc } from "@/types/readme";

export interface ToolbarProps {
    ref?: React.Ref<HTMLDivElement>;
    doc: ReadmeDoc;
    flavor: Flavor;
    onFlavor: (flavor: Flavor) => void;
    raw: boolean;
    onRaw: () => void;
    editing: boolean;
    onEdit: () => void;
    dirty: boolean;
    saveStatus: SaveStatus;
    onSave: () => void;
    headings: Heading[];
    active: string | null;
    outlineOpen: boolean;
    onOutlineOpenChange: (open: boolean) => void;
    copy: CopyStatus;
    onCopy: () => void;
    onClose: () => void;
}

interface HintProps {
    label: string;
    shortcut?: ShortcutId;
    children: React.ReactNode;
}

/**
 * Tooltip with the action name and its shortcut, wrapped around a toolbar
 * button.
 *
 * @param label - Action name shown in the tooltip
 * @param shortcut - Catalog shortcut shown after the name, omitted for actions without one
 * @param children - Button that triggers the tooltip; it must forward its ref (asChild)
 */
function Hint({ label, shortcut, children }: HintProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
                {label}
                {shortcut ? <Keys shortcut={shortcut} /> : null}
            </TooltipContent>
        </Tooltip>
    );
}

/**
 * File tab of the document sheet, marked when it holds unsaved edits, with its
 * actions: flavor pills (on the line of the settings pill on small screens,
 * with the tab and the buttons together below them, the tab shortening to make
 * room),
 * save, edit, raw view (not on small screens, where the editor shows the
 * source), outline (below the width where the rail shows), share
 * link, source page and close. The buttons show their text only when the
 * toolbar itself is wide enough, which the outline rail on the side makes rarer
 * than the window width suggests.
 */
export function Toolbar({
    ref,
    doc,
    flavor,
    onFlavor,
    raw,
    onRaw,
    editing,
    onEdit,
    dirty,
    saveStatus,
    onSave,
    headings,
    active,
    outlineOpen,
    onOutlineOpenChange,
    copy,
    onCopy,
    onClose,
}: ToolbarProps) {
    const t = useTranslations("reader");
    const saveLabel = canPickFile() ? t("save") : t("download");
    const flavors = useTranslations("flavors");
    const options = useMemo(
        () =>
            FLAVORS.map((item) => ({
                value: item.id,
                label: item.label,
                description: flavors(item.id),
            })),
        [flavors],
    );

    return (
        <div ref={ref} className="@container flex flex-wrap items-end gap-x-1 md:flex-nowrap">
            <div className="order-1 mb-2 flex min-h-10 w-full items-center pr-14 print:hidden md:order-2 md:mb-1.5 md:ml-auto md:min-h-0 md:w-auto md:shrink-0 md:pr-0">
                {raw ? null : (
                    <Pills
                        label={t("flavor")}
                        options={options}
                        value={flavor}
                        onChange={onFlavor}
                    />
                )}
            </div>

            <div className="order-2 flex w-full min-w-0 items-end gap-1 md:contents">
                <div className="relative top-px flex min-w-0 shrink items-center gap-2 rounded-t-[10px] border border-b-0 bg-card px-4 pt-2.5 pb-[11px] font-mono text-[13px] font-medium md:order-1">
                    <FileText aria-hidden="true" className="size-[15px] shrink-0 text-brand" />
                    <span className="truncate">{doc.name}</span>
                    {dirty ? (
                        <>
                            <span
                                aria-hidden="true"
                                className="size-1.5 shrink-0 rounded-full bg-brand"
                            />
                            <span className="sr-only">{t("unsaved")}</span>
                        </>
                    ) : null}
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-1 pb-1.5 print:hidden md:order-3 md:ml-0">
                    {editing || dirty ? (
                        <Hint label={saveLabel} shortcut="save">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onSave}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                {saveStatus === "saved" ? (
                                    <Check className="text-brand" />
                                ) : saveStatus === "failed" ? (
                                    <X className="text-destructive" />
                                ) : (
                                    <Save />
                                )}
                                <span className="sr-only @4xl:not-sr-only">
                                    {saveStatus === "saved"
                                        ? t("saved")
                                        : saveStatus === "failed"
                                          ? t("saveFailed")
                                          : saveLabel}
                                </span>
                            </Button>
                        </Hint>
                    ) : null}

                    <Hint label={t("edit")} shortcut="edit">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("edit")}
                            aria-pressed={editing}
                            onClick={onEdit}
                            className="text-muted-foreground hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground"
                        >
                            <Pencil />
                        </Button>
                    </Hint>

                    {editing ? null : (
                        <Hint label={t("raw")} shortcut="raw">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t("raw")}
                                aria-pressed={raw}
                                onClick={onRaw}
                                className="text-muted-foreground hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground max-sm:hidden"
                            >
                                <Code />
                            </Button>
                        </Hint>
                    )}

                    {headings.length > 1 && !raw && !editing ? (
                        <Popover open={outlineOpen} onOpenChange={onOutlineOpenChange}>
                            <Hint label={t("outline")} shortcut="outline">
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={t("outline")}
                                        className="text-muted-foreground hover:text-foreground xl:hidden"
                                    >
                                        <ListTree />
                                    </Button>
                                </PopoverTrigger>
                            </Hint>
                            <PopoverContent
                                align="end"
                                className="max-h-[70vh] w-72 overflow-y-auto p-3"
                            >
                                <Outline
                                    headings={headings}
                                    active={active}
                                    onNavigate={() => onOutlineOpenChange(false)}
                                />
                            </PopoverContent>
                        </Popover>
                    ) : null}

                    {doc.source ? (
                        <>
                            <Hint label={t("shareLink")} shortcut="copyLink">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onCopy}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    {copy === "copied" ? (
                                        <Check className="text-brand" />
                                    ) : copy === "failed" ? (
                                        <X className="text-destructive" />
                                    ) : (
                                        <LinkIcon />
                                    )}
                                    <span className="sr-only @4xl:not-sr-only">
                                        {copy === "copied"
                                            ? t("linkCopied")
                                            : copy === "failed"
                                              ? t("copyFailed")
                                              : t("copyLink")}
                                    </span>
                                </Button>
                            </Hint>
                            <Hint label={t("openOrigin")}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <a
                                        href={doc.source.page}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink />
                                        <span className="sr-only @4xl:not-sr-only">
                                            {t("source")}
                                        </span>
                                    </a>
                                </Button>
                            </Hint>
                        </>
                    ) : null}

                    <Hint label={t("close")} shortcut="close">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("close")}
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X />
                        </Button>
                    </Hint>
                </div>
            </div>
        </div>
    );
}
