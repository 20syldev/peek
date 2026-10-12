"use client";

import type { Element } from "hast";
import { toString } from "hast-util-to-string";
import { useTheme } from "next-themes";
import type { ComponentProps } from "react";

import { Callout, CalloutTitle } from "@/components/markdown/Callout";
import { Mermaid } from "@/components/markdown/Mermaid";
import type { AlertKind } from "@/lib/markdown/alerts";
import { domProps } from "@/lib/utils";

interface AlertData {
    node?: Element;
    "data-alert"?: AlertKind;
    "data-alert-title"?: string;
    "data-alert-custom"?: boolean | string;
}

export type DivProps = ComponentProps<"div"> & AlertData;
export type DetailsProps = ComponentProps<"details"> & AlertData;
export type ParagraphProps = ComponentProps<"p"> & AlertData;
export type SummaryProps = ComponentProps<"summary"> & AlertData;
export type FigureProps = ComponentProps<"figure"> & { node?: Element; "data-mermaid"?: string };
export type SourceProps = ComponentProps<"source"> & { node?: Element };
export type TableProps = ComponentProps<"table"> & { node?: Element };

/**
 * Div of the document, or the frame of an alert marked by the alerts plugin.
 */
export function Div(props: DivProps) {
    const kind = props["data-alert"];
    if (kind) return <Callout kind={kind}>{props.children}</Callout>;
    return <div {...domProps(props)} />;
}

/**
 * Details element of the document, or an Obsidian foldable callout.
 */
export function Details(props: DetailsProps) {
    const kind = props["data-alert"];
    if (kind) {
        return (
            <Callout kind={kind} foldable open={props.open}>
                {props.children}
            </Callout>
        );
    }
    return <details {...domProps(props)} />;
}

/**
 * Paragraph of the document, or the title line of an alert.
 */
export function Paragraph(props: ParagraphProps) {
    const kind = props["data-alert"];
    if (kind && props["data-alert-title"] !== undefined) {
        return (
            <CalloutTitle kind={kind} custom={props["data-alert-custom"] !== undefined}>
                {props.children}
            </CalloutTitle>
        );
    }
    return <p {...domProps(props)} />;
}

/**
 * Summary of a details element, or the title line of a foldable callout.
 */
export function Summary(props: SummaryProps) {
    const kind = props["data-alert"];
    if (kind && props["data-alert-title"] !== undefined) {
        return (
            <CalloutTitle kind={kind} custom={props["data-alert-custom"] !== undefined} foldable>
                {props.children}
            </CalloutTitle>
        );
    }
    return <summary {...domProps(props)} />;
}

/**
 * Figure of the document, or a Mermaid diagram placeholder holding its source.
 */
export function Figure(props: FigureProps) {
    if (props["data-mermaid"] !== undefined && props.node) {
        return <Mermaid code={toString(props.node)} />;
    }
    return <figure {...domProps(props)} />;
}

/**
 * Table of the document, focusable since it scrolls horizontally when wide.
 */
export function Table(props: TableProps) {
    return <table {...domProps(props)} tabIndex={0} />;
}

/**
 * Picture source that follows the app theme instead of the system one:
 * READMEs switch logos with prefers-color-scheme media queries, which would
 * ignore a theme chosen in the settings.
 */
export function ThemedSource(props: SourceProps) {
    const { resolvedTheme } = useTheme();
    const { media } = props;
    const scheme = media ? /prefers-color-scheme\s*:\s*(dark|light)/i.exec(media)?.[1] : undefined;
    const value = scheme ? (scheme.toLowerCase() === resolvedTheme ? "all" : "not all") : media;
    return <source {...domProps(props)} media={value} />;
}
