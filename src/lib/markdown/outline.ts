import type { Element, Root, RootContent } from "hast";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";

import type { Heading } from "@/types/readme";

const HEADING = /^h([1-6])$/;

/**
 * Tells whether an element carries a given class name.
 *
 * @param element - Element whose className property is read, possibly missing or not a list
 * @param name - Class to look for
 * @returns True when the class list contains the name
 */
function hasClass(element: Element, name: string): boolean {
    const value = element.properties.className;
    return Array.isArray(value) && value.includes(name);
}

/**
 * Reads the plain text of a node, using the TeX source of rendered formulas
 * instead of the several copies KaTeX emits (MathML, annotation, HTML).
 *
 * @param node - Heading element or any descendant
 * @returns The text as a reader would see it
 */
function plainText(node: Element | RootContent): string {
    if (node.type === "text") return node.value;
    if (node.type !== "element") return "";
    if (hasClass(node, "katex")) {
        let tex = "";
        visit(node, "element", (child) => {
            if (child.tagName === "annotation") tex = toString(child);
        });
        return tex;
    }
    return node.children.map(plainText).join("");
}

/**
 * Lists the headings of a rendered document, in order, for the outline and
 * the [TOC] placeholder. Headings without an id and the visually hidden
 * footnotes label are skipped.
 *
 * @param tree - Sanitized hast tree, after rehypeHeadingIds assigned the ids
 * @returns One entry per heading
 */
export function collectHeadings(tree: Root): Heading[] {
    const headings: Heading[] = [];
    visit(tree, "element", (node) => {
        const match = HEADING.exec(node.tagName);
        const id = node.properties.id;
        if (!match || typeof id !== "string" || hasClass(node, "sr-only")) return;
        const text = plainText(node).trim();
        if (text) headings.push({ id, text, level: Number(match[1]) });
    });
    return headings;
}
