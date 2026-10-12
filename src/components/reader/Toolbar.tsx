"use client";

import { Check, Code, ExternalLink, FileText, Link as LinkIcon, ListTree, X } from "lucide-react";
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
import type { Flavor, Heading, ReadmeDoc } from "@/types/readme";

export interface ToolbarProps {
    ref?: React.Ref<HTMLDivElement>;
    doc: ReadmeDoc;
    flavor: Flavor;
    onFlavor: (flavor: Flavor) => void;
    raw: boolean;
    onRaw: () => void;
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
 * File tab of the document sheet with its actions: flavor pills (on the line of the settings pill on small screens), outline
 * (below the width where the rail shows), share link, source page and close.
 */
export function Toolbar({
    ref,
    doc,
    flavor,
    onFlavor,
    raw,
    onRaw,
    headings,
    active,
    outlineOpen,
    onOutlineOpenChange,
    copy,
    onCopy,
    onClose,
}: ToolbarProps) {
    const t = useTranslations("reader");
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
        <div ref={ref} className="flex flex-wrap items-end gap-x-1">
            <div className="relative top-px order-2 flex min-w-0 items-center gap-2 rounded-t-[10px] border border-b-0 bg-card px-4 pt-2.5 pb-[11px] font-mono text-[13px] font-medium sm:order-1">
                <FileText aria-hidden="true" className="size-[15px] shrink-0 text-brand" />
                <span className="truncate">{doc.name}</span>
            </div>

            <div className="order-1 mb-2 flex min-h-10 w-full items-center pr-14 print:hidden sm:order-2 sm:mb-1.5 sm:ml-auto sm:min-h-0 sm:w-auto sm:pr-0">
                {raw ? null : (
                    <Pills
                        label={t("flavor")}
                        options={options}
                        value={flavor}
                        onChange={onFlavor}
                    />
                )}
            </div>

            <div className="order-3 ml-auto flex items-center gap-1 pb-1.5 print:hidden sm:order-3 sm:ml-auto">
                <Hint label={t("raw")} shortcut="raw">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("raw")}
                        aria-pressed={raw}
                        onClick={onRaw}
                        className="text-muted-foreground hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground"
                    >
                        <Code />
                    </Button>
                </Hint>

                {headings.length > 1 && !raw ? (
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
                                <span className="max-sm:sr-only">
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
                                <a href={doc.source.page} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink />
                                    <span className="max-sm:sr-only">{t("source")}</span>
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
    );
}
