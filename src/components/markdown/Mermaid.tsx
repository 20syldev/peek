"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";

interface Result {
    key: string;
    svg?: string;
    error?: boolean;
}

/**
 * Render counter: Mermaid needs a fresh element id for every render call.
 */
let renders = 0;

export interface MermaidProps {
    code: string;
}

/**
 * Mermaid diagram, rendered client-side with the library loaded on demand,
 * at the strict security level (sanitized labels, no scripts). The source
 * stays visible while rendering and when the diagram is invalid.
 */
export function Mermaid({ code }: MermaidProps) {
    const t = useTranslations("markdown");
    const { resolvedTheme } = useTheme();
    const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const [result, setResult] = useState<Result>();
    const key = `${resolvedTheme}:${code}`;

    useEffect(() => {
        let cancelled = false;
        void import("mermaid").then(async ({ default: mermaid }) => {
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: "strict",
                theme: resolvedTheme === "dark" ? "dark" : "neutral",
                fontFamily: "inherit",
            });
            try {
                renders += 1;
                const { svg } = await mermaid.render(`mermaid-${baseId}-${renders}`, code);
                if (!cancelled) setResult({ key, svg });
            } catch {
                if (!cancelled) setResult({ key, error: true });
            }
        });
        return () => {
            cancelled = true;
        };
    }, [baseId, code, key, resolvedTheme]);

    const current = result?.key === key ? result : undefined;

    if (current?.svg) {
        return (
            <figure
                className="mb-4 flex justify-center overflow-x-auto rounded-lg border bg-card p-4 [&_svg]:h-auto [&_svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: current.svg }}
            />
        );
    }

    return (
        <figure className="mb-4 overflow-hidden rounded-lg border bg-muted">
            <pre
                tabIndex={0}
                aria-label={t("diagramSource")}
                className="m-0 overflow-x-auto p-4 font-mono text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
                {code}
            </pre>
            {current?.error ? (
                <figcaption className="border-t px-4 py-2 text-sm text-destructive">
                    {t("diagramError")}
                </figcaption>
            ) : null}
        </figure>
    );
}
