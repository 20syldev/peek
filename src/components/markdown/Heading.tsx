"use client";

import type { Element } from "hast";
import type { ComponentProps } from "react";

import { fragmentOf, scrollToAnchor } from "@/lib/navigation";
import { cn, domProps } from "@/lib/utils";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type HeadingProps = ComponentProps<"h2"> & { node?: Element };

/**
 * Document heading with its Markdown marker ("#", "##"...) hanging in the
 * left margin on wide screens, inline on small ones. The marker is a mouse
 * shortcut to the permalink, hidden from assistive technology.
 */
export function Heading(props: HeadingProps) {
    const { node, id, children, className } = props;
    const Tag = (node?.tagName ?? "h2") as HeadingTag;
    const level = Number(Tag.slice(1));

    return (
        <Tag {...domProps(props)} className={cn("group relative", className)}>
            {id ? (
                <a
                    href={`#${fragmentOf(id)}`}
                    data-marker=""
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                        event.preventDefault();
                        scrollToAnchor(id);
                        const { pathname, search } = window.location;
                        window.history.replaceState(
                            null,
                            "",
                            `${pathname}${search}#${fragmentOf(id)}`,
                        );
                    }}
                    className="mr-2 font-mono text-[0.8em] font-normal text-brand no-underline hover:text-brand md:absolute md:right-full md:mr-3 md:leading-[1.5625] md:whitespace-nowrap md:text-muted-foreground/60 print:hidden"
                >
                    {"#".repeat(level)}
                </a>
            ) : null}
            {children}
        </Tag>
    );
}
