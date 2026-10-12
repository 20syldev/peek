import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useState } from "react";

import type { RenderLabels } from "@/lib/markdown/labels";
import type { Rendered } from "@/lib/markdown/pipeline";
import { RenderAborted, renderInWorker, RenderTimeout } from "@/lib/markdown/render";
import type { Flavor, ReadmeDoc } from "@/types/readme";

export type RenderError = "failed" | "timeout";

interface Result {
    doc: ReadmeDoc;
    flavor: Flavor;
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
 * @returns The rendering to show (null while the first one runs), whether a newer one is on its way, and the error of the latest attempt
 */
export function useRendered(doc: ReadmeDoc, flavor: Flavor) {
    const t = useTranslations("markdown");
    const [result, setResult] = useState<Result>();

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
        let cancelled = false;
        renderInWorker(doc.content, { flavor, source: doc.source, labels: labels() }).then(
            (rendered) => {
                if (!cancelled) setResult({ doc, flavor, rendered });
            },
            (error: unknown) => {
                if (cancelled || error instanceof RenderAborted) return;
                setResult({
                    doc,
                    flavor,
                    error: error instanceof RenderTimeout ? "timeout" : "failed",
                });
            },
        );
        return () => {
            cancelled = true;
        };
    }, [doc, flavor]);

    const sameDoc = result?.doc === doc;
    const current = sameDoc && result.flavor === flavor;
    return {
        rendered: sameDoc ? (result.rendered ?? null) : null,
        pending: !current,
        error: current ? result.error : undefined,
    };
}
