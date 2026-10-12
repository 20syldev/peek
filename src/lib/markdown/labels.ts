import type { AlertKind } from "@/lib/markdown/alerts";

export interface RenderLabels {
    alerts: Record<AlertKind, string>;
    footnotes: string;
    footnoteBack: string;
    footnoteBackText: string;
    toc: string;
    relativeLink: string;
}
