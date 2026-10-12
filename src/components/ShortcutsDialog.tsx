"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Keys } from "@/components/Keys";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { SHORTCUTS, type ShortcutScope } from "@/data/shortcuts";
import { usePreference } from "@/hooks/usePreference";
import { SINGLE_KEYS_KEY } from "@/hooks/useShortcuts";

const SCOPES: ShortcutScope[] = ["global", "home", "document"];

export interface ShortcutsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Help dialog listing every keyboard shortcut of the catalog, grouped by the
 * screen where it applies, with the switch that turns character keys off. It
 * is styled as a Markdown sheet under its file tab, like the document screen.
 */
export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
    const t = useTranslations("shortcuts");
    const [singleKeys, setSingleKeys] = usePreference(SINGLE_KEYS_KEY);
    const opener = useRef<HTMLElement | null>(null);
    const content = useRef<HTMLDivElement>(null);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                ref={content}
                aria-describedby="single-keys-hint"
                className="max-w-[calc(100%-2rem)] gap-0 rounded-tl-none p-0 sm:max-w-md"
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    opener.current = document.activeElement as HTMLElement | null;
                    content.current?.focus();
                }}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    opener.current?.focus();
                }}
            >
                <div
                    aria-hidden="true"
                    className="absolute bottom-full -left-px flex items-center gap-2 rounded-t-[10px] border border-b-0 bg-card px-4 pt-2.5 pb-[11px] font-mono text-[13px] font-medium"
                >
                    <FileText className="size-[15px] text-brand" />
                    {t("file")}
                </div>
                <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-6 py-6">
                    <DialogTitle className="font-semibold tracking-tight">
                        <span aria-hidden="true" className="mr-2 font-mono text-brand">
                            #
                        </span>
                        {t("title")}
                    </DialogTitle>
                    <div className="mt-5 flex flex-col gap-4">
                        {SCOPES.map((scope) => (
                            <section key={scope} className="flex flex-col gap-1">
                                <h3 className="font-mono text-xs font-medium text-muted-foreground">
                                    <span aria-hidden="true" className="mr-2 text-brand">
                                        ##
                                    </span>
                                    {t(`scopes.${scope}`)}
                                </h3>
                                <ul className="flex flex-col">
                                    {SHORTCUTS.filter((item) => item.scope === scope).map(
                                        (item) => (
                                            <li
                                                key={item.id}
                                                className="flex items-center gap-3 py-1 text-sm"
                                            >
                                                {t(`items.${item.id}`)}
                                                <span
                                                    aria-hidden="true"
                                                    className="min-w-4 flex-1 border-t border-dotted"
                                                />
                                                <Keys shortcut={item.id} withAlt />
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </section>
                        ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-4 border-t pt-4">
                        <div className="flex flex-col gap-0.5 text-sm">
                            <span id="single-keys-label" className="font-medium">
                                {t("singleKeys")}
                            </span>
                            <span id="single-keys-hint" className="text-xs text-muted-foreground">
                                {t("singleKeysHint")}
                            </span>
                        </div>
                        <Switch
                            id="single-keys"
                            className="data-[state=checked]:bg-brand data-[state=unchecked]:bg-muted-foreground/70"
                            aria-labelledby="single-keys-label"
                            aria-describedby="single-keys-hint"
                            checked={singleKeys !== "off"}
                            onCheckedChange={(checked) => setSingleKeys(checked ? "on" : "off")}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
