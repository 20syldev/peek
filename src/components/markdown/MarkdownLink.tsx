"use client";

import type { Element } from "hast";
import { Undo2 } from "lucide-react";
import type { ComponentProps, MouseEvent } from "react";

import { keepFlavor, navigate, scrollToAnchor } from "@/lib/navigation";
import { domProps } from "@/lib/utils";

export type MarkdownLinkProps = ComponentProps<"a"> & {
    node?: Element;
    "data-footnote-backref"?: string;
};

/**
 * Tells whether a click asks the browser for something else than a plain
 * navigation (new tab, new window, download).
 *
 * @param event - Click on a link, from the main button or another one
 * @returns True when the browser default must be kept
 */
function isModified(event: MouseEvent): boolean {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/**
 * Link of the rendered document: anchors scroll in place, `?url=` links open
 * the target in the viewer keeping the flavor, external links open in a new
 * tab, and footnote back links show an icon.
 */
export function MarkdownLink(props: MarkdownLinkProps) {
    const { href, children, onClick } = props;
    const external = href ? /^https?:\/\//i.test(href) : false;
    const backref = props["data-footnote-backref"] !== undefined;

    return (
        <a
            {...domProps(props)}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            onClick={(event) => {
                onClick?.(event);
                if (!href || event.defaultPrevented || isModified(event)) return;

                if (href.startsWith("#")) {
                    if (!scrollToAnchor(href)) return;
                    event.preventDefault();
                    const { pathname, search } = window.location;
                    window.history.replaceState(null, "", `${pathname}${search}${href}`);
                } else if (href.startsWith("?")) {
                    event.preventDefault();
                    navigate(keepFlavor(href));
                }
            }}
        >
            {backref ? (
                <Undo2 aria-hidden="true" className="inline size-3.5 align-[-0.15em]" />
            ) : (
                children
            )}
        </a>
    );
}
