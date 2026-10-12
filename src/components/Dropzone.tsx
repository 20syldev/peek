"use client";

import { FileUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Keys } from "@/components/Keys";

export interface DropzoneProps {
    dragging: boolean;
    onBrowse: () => void;
}

/**
 * Large dashed target inviting to drop a Markdown file; clicking it opens the
 * file picker. Its text is hidden, never swapped, while dragging, so the drag
 * leave events keep reaching the window.
 */
export function Dropzone({ dragging, onBrowse }: DropzoneProps) {
    const t = useTranslations("dropzone");
    return (
        <button
            type="button"
            onClick={onBrowse}
            data-active={dragging}
            className="flex w-full flex-col items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-input px-6 py-9 text-center transition-colors outline-none hover:border-brand hover:bg-brand/5 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring data-[active=true]:border-brand data-[active=true]:bg-brand/10"
        >
            <FileUp
                aria-hidden="true"
                className="size-6 text-muted-foreground"
                strokeWidth={1.75}
            />
            <span hidden={!dragging} className="text-base font-medium">
                {t("release")}
            </span>
            <span hidden={dragging} className="text-base font-medium">
                {t.rich("drop", {
                    code: (chunks) => (
                        <code className="rounded-[5px] bg-muted px-1.5 py-0.5 font-mono text-sm">
                            {chunks}
                        </code>
                    ),
                })}
            </span>
            <span
                hidden={dragging}
                className="flex items-center gap-2 text-sm text-muted-foreground"
            >
                {t("browse")}
                <Keys shortcut="open" />
            </span>
        </button>
    );
}
