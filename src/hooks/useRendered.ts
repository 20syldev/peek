import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { RenderLabels } from "@/lib/markdown/labels";
import type { Rendered } from "@/lib/markdown/pipeline";
import { RenderAborted, renderInWorker, RenderTimeout } from "@/lib/markdown/render";
import type { Flavor, ReadmeDoc } from "@/types/readme";

export type RenderError = "failed" | "timeout";

interface Result {
    doc: ReadmeDoc;
    flavor: Flavor;
    content: string;
    rendered?: Rendered;
    error?: RenderError;
}

/**
 * Renders a document in the background worker. While a new flavor of the
 * same document renders, the previous rendering stays on screen so the
 * switch does not flash; a new document shows nothing until it is ready.
 *
 * The texts the rendering adds itself (alert titles, footnote labels...) are
 * handed to the worker in the language of the page.
 *
 * @param doc - Document to render; a new object means a new document
 * @param flavor - Markdown flavor to follow
 * @param content - Source to render, the document's own by default; while it
 *   changes under an editor, a render waits for the previous one instead of
 *   cancelling it, and the previous rendering stays on screen
 * @returns The rendering to show (null while the first one runs), whether a newer one is on its way, and the error of the latest attempt
 */
export function useRendered(doc: ReadmeDoc, flavor: Flavor, content = doc.content) {
    const t = useTranslations("markdown");
    const [result, setResult] = useState<Result>();
    const requests = useRef(0);
    const applied = useRef(0);

    const labels = useEffectEvent((): RenderLabels => ({
        alerts: {
            note: t("alerts.note"),
            tip: t("alerts.tip"),
            important: t("alerts.important"),
            warning: t("alerts.warning"),
            caution: t("alerts.caution"),
        },
        footnotes: t("footnotes"),
        footnoteBack: t.raw("footnoteBack") as string,
        footnoteBackText: t("footnoteBackText"),
        toc: t("toc"),
        relativeLink: t("relativeLink"),
    }));

    useEffect(() => {
        requests.current += 1;
        const mine = requests.current;
        // Results land in order: an older one never replaces a newer one, but is not thrown away
        // while typing keeps queuing newer requests, or the preview would never update
        const settle = (next: Result) => {
            if (mine <= applied.current) return;
            applied.current = mine;
            setResult(next);
        };
        renderInWorker(
            content,
            { flavor, source: doc.source, labels: labels() },
            { interrupt: content === doc.content },
        ).then(
            (rendered) => settle({ doc, flavor, content, rendered }),
            (error: unknown) => {
                if (error instanceof RenderAborted) return;
                settle({
                    doc,
                    flavor,
                    content,
                    error: error instanceof RenderTimeout ? "timeout" : "failed",
                });
            },
        );
    }, [doc, flavor, content]);

    const sameDoc = result?.doc === doc;
    const current = sameDoc && result.flavor === flavor && result.content === content;
    return {
        rendered: sameDoc ? (result.rendered ?? null) : null,
        pending: !current,
        error: current ? result.error : undefined,
    };
}
