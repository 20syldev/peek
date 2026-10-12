"use client";

import { useTranslations } from "next-intl";

import { fragmentOf, scrollToAnchor } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { Heading } from "@/types/readme";

/**
 * Indentation per depth below the shallowest heading, spelled out for Tailwind.
 */
const INDENT = ["pl-3.5", "pl-6", "pl-9", "pl-12", "pl-14", "pl-16"];

export interface OutlineProps {
    headings: Heading[];
    active: string | null;
    onNavigate?: () => void;
    className?: string;
}

/**
 * Table of contents of the document, indented by heading level, with the
 * current section marked by an accent rule.
 */
export function Outline({ headings, active, onNavigate, className }: OutlineProps) {
    const t = useTranslations("reader");
    const top = Math.min(...headings.map((heading) => heading.level));

    return (
        <nav aria-label={t("outline")} className={cn("flex flex-col border-l", className)}>
            {headings.map((heading) => (
                <a
                    key={heading.id}
                    href={`#${fragmentOf(heading.id)}`}
                    aria-current={heading.id === active ? "location" : undefined}
                    onClick={(event) => {
                        event.preventDefault();
                        scrollToAnchor(heading.id);
                        const { pathname, search } = window.location;
                        window.history.replaceState(
                            null,
                            "",
                            `${pathname}${search}#${fragmentOf(heading.id)}`,
                        );
                        onNavigate?.();
                    }}
                    className={cn(
                        "-ml-px border-l-2 border-transparent py-1.5 pr-2 text-sm leading-snug text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground focus-visible:underline aria-[current=location]:border-brand aria-[current=location]:font-medium aria-[current=location]:text-foreground",
                        INDENT[Math.min(heading.level - top, INDENT.length - 1)],
                    )}
                >
                    {heading.text}
                </a>
            ))}
        </nav>
    );
}
