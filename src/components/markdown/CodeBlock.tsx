"use client";

import type { Element } from "hast";
import { Check, Copy, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ComponentProps, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useCopy } from "@/hooks/useCopy";
import { cn, domProps } from "@/lib/utils";

export type CodeBlockProps = ComponentProps<"pre"> & { node?: Element };

/**
 * Reads the language of a fenced code block from its code element.
 *
 * @param node - The pre element, as passed by the Markdown renderer
 * @returns The language name, or undefined for a block without info string
 */
function languageOf(node?: Element): string | undefined {
    const code = node?.children.find(
        (child): child is Element => child.type === "element" && child.tagName === "code",
    );
    const classes = code?.properties.className;
    if (!Array.isArray(classes)) return undefined;
    const name = classes.map(String).find((value) => value.startsWith("language-"));
    return name?.slice("language-".length);
}

/**
 * Fenced code block with its language and a copy button. The button copies
 * the rendered text, never markup hidden from view, and the block scrolls
 * horizontally with the keyboard too.
 */
export function CodeBlock(props: CodeBlockProps) {
    const { node, className } = props;
    const t = useTranslations("markdown");
    const pre = useRef<HTMLPreElement>(null);
    const { status, copy } = useCopy();
    const language = languageOf(node);

    const button = (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("copyCode")}
            onClick={() => void copy(pre.current?.innerText ?? "")}
            className={cn(
                "text-muted-foreground hover:text-foreground print:hidden",
                !language &&
                    "bg-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
            )}
        >
            {status === "copied" ? (
                <Check className="text-brand" />
            ) : status === "failed" ? (
                <X className="text-destructive" />
            ) : (
                <Copy />
            )}
        </Button>
    );

    return (
        <div className="group relative mb-4 overflow-hidden rounded-lg border bg-muted">
            {language ? (
                <div className="flex h-9 items-center justify-between border-b pr-1 pl-3.5 font-mono text-xs text-muted-foreground">
                    <span>{language}</span>
                    {button}
                </div>
            ) : (
                <div className="absolute top-1.5 right-1.5">{button}</div>
            )}
            <pre
                {...domProps(props)}
                ref={pre}
                tabIndex={0}
                className={cn(
                    "m-0 overflow-x-auto p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    className,
                )}
            />
            <span role="status" className="sr-only">
                {status === "copied" ? t("codeCopied") : status === "failed" ? t("copyFailed") : ""}
            </span>
        </div>
    );
}
