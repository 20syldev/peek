"use client";

import type { Root } from "hast";
import { type Components, toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

import {
    Details,
    Div,
    Figure,
    Paragraph,
    Summary,
    Table,
    ThemedSource,
} from "@/components/markdown/Blocks";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { Heading } from "@/components/markdown/Heading";
import { MarkdownLink } from "@/components/markdown/MarkdownLink";

const COMPONENTS: Partial<Components> = {
    a: MarkdownLink,
    details: Details,
    div: Div,
    figure: Figure,
    h1: Heading,
    h2: Heading,
    h3: Heading,
    h4: Heading,
    h5: Heading,
    h6: Heading,
    p: Paragraph,
    pre: CodeBlock,
    source: ThemedSource,
    summary: Summary,
    table: Table,
};

export interface MarkdownProps {
    tree: Root;
}

/**
 * Renders a sanitized Markdown tree to React, swapping the elements that
 * need behavior (links, headings, code, alerts, diagrams) for components.
 */
export function Markdown({ tree }: MarkdownProps) {
    return (
        <div className="markdown">
            {toJsxRuntime(tree, {
                Fragment,
                jsx,
                jsxs,
                components: COMPONENTS,
                passNode: true,
                ignoreInvalidStyle: true,
            })}
        </div>
    );
}
