import type { Element, ElementContent, Root } from "hast";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";

import { collectHeadings } from "@/lib/markdown/outline";
import { fragmentOf } from "@/lib/navigation";
import type { Heading } from "@/types/readme";

// GitLab, Python-Markdown and Typora spellings of the table of contents marker
const PLACEHOLDER = /^\[(?:toc|\[_?toc_?\])\]$/i;

interface Frame {
    level: number;
    list: Element;
    last?: Element;
}

/**
 * Creates an empty list element for the generated table of contents.
 *
 * @returns A ul element with no items
 */
function list(): Element {
    return { type: "element", tagName: "ul", properties: {}, children: [] };
}

/**
 * Builds a nested list of links mirroring the heading hierarchy. A heading
 * deeper than its predecessor opens a sub-list inside the previous item.
 *
 * @param headings - Document headings in order
 * @returns The root list
 */
function buildList(headings: Heading[]): Element {
    const root = list();
    const stack: Frame[] = [{ level: 0, list: root }];

    for (const heading of headings) {
        while (stack.length > 1 && stack[stack.length - 1].level > heading.level) stack.pop();
        let frame = stack[stack.length - 1];

        if (frame.level === 0) {
            frame.level = heading.level;
        } else if (heading.level > frame.level && frame.last) {
            const nested = list();
            frame.last.children.push(nested);
            frame = { level: heading.level, list: nested };
            stack.push(frame);
        }

        const link: ElementContent = {
            type: "element",
            tagName: "a",
            properties: { href: `#${fragmentOf(heading.id)}` },
            children: [{ type: "text", value: heading.text }],
        };
        const item: Element = { type: "element", tagName: "li", properties: {}, children: [link] };
        frame.list.children.push(item);
        frame.last = item;
    }
    return root;
}

/**
 * Rehype plugin replacing a paragraph that only holds [TOC] or [[_TOC_]] by
 * a table of contents of the document headings.
 *
 * @param options - Accessible name of the generated navigation
 * @returns The tree transformer
 */
export function rehypeToc(options: { label: string }) {
    return (tree: Root) => {
        let headings: Heading[] | undefined;
        visit(tree, "element", (node, index, parent) => {
            if (node.tagName !== "p" || !parent || index === undefined) return;
            if (!PLACEHOLDER.test(toString(node).trim())) return;

            headings ??= collectHeadings(tree);
            parent.children[index] = {
                type: "element",
                tagName: "nav",
                properties: { className: ["toc"], ariaLabel: options.label },
                children: [buildList(headings)],
            };
        });
    };
}
