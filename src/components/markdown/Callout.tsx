import {
    ChevronRight,
    Info,
    Lightbulb,
    type LucideIcon,
    MessageSquareWarning,
    OctagonAlert,
    TriangleAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { type AlertKind } from "@/lib/markdown/alerts";
import { cn } from "@/lib/utils";

/**
 * Icon and color classes of each alert kind. Icons follow GitHub's choice;
 * the classes are spelled out so Tailwind finds them.
 */
const STYLES: Record<AlertKind, { icon: LucideIcon; border: string; text: string }> = {
    note: { icon: Info, border: "border-alert-note", text: "text-alert-note" },
    tip: { icon: Lightbulb, border: "border-alert-tip", text: "text-alert-tip" },
    important: {
        icon: MessageSquareWarning,
        border: "border-alert-important",
        text: "text-alert-important",
    },
    warning: { icon: TriangleAlert, border: "border-alert-warning", text: "text-alert-warning" },
    caution: { icon: OctagonAlert, border: "border-alert-caution", text: "text-alert-caution" },
};

export interface CalloutProps {
    kind: AlertKind;
    foldable?: boolean;
    open?: boolean;
    children?: ReactNode;
}

export interface CalloutTitleProps {
    kind: AlertKind;
    custom?: boolean;
    foldable?: boolean;
    children?: ReactNode;
}

/**
 * Frame of a GitHub or GitLab alert, or of an Obsidian callout: a rule in
 * the color of its kind around the title and the quoted content.
 */
export function Callout({ kind, foldable, open, children }: CalloutProps) {
    const frame = cn("mb-4 border-l-[0.25em] py-1 pl-4 [&>:last-child]:mb-0", STYLES[kind].border);
    if (foldable) {
        return (
            <details open={open} className={cn("group/callout", frame)}>
                {children}
            </details>
        );
    }
    return (
        <div role="note" className={frame}>
            {children}
        </div>
    );
}

/**
 * Title line of a callout with the icon of its kind; the summary of a
 * foldable callout also shows a chevron that turns when it opens.
 */
export function CalloutTitle({ kind, custom, foldable, children }: CalloutTitleProps) {
    const t = useTranslations("markdown");
    const { icon: Icon, text } = STYLES[kind];
    const content = (
        <>
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {custom ? (
                <span className="sr-only">{t("alertPrefix", { label: t(`alerts.${kind}`) })}</span>
            ) : null}
            <span>{children}</span>
        </>
    );

    if (foldable) {
        return (
            <summary
                className={cn(
                    "flex cursor-pointer list-none items-center gap-2 font-semibold group-open/callout:mb-2 [&::-webkit-details-marker]:hidden",
                    text,
                )}
            >
                {content}
                <ChevronRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-open/callout:rotate-90"
                />
            </summary>
        );
    }
    return <p className={cn("mb-1 flex items-center gap-2 font-semibold", text)}>{content}</p>;
}
