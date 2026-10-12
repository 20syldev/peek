import { FileDown } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Full-page hint shown while a file is dragged over an open document. It
 * ignores pointer events so the drop still reaches the window listener.
 */
export function DropOverlay() {
    const t = useTranslations("dropzone");
    return (
        <div className="pointer-events-none fixed inset-0 z-50 flex animate-in items-center justify-center bg-background/80 p-6 backdrop-blur-sm duration-150 fade-in">
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand bg-card px-12 py-10 text-center shadow-lg">
                <FileDown aria-hidden="true" className="size-7 text-brand" />
                <p className="text-lg font-medium">{t("replace")}</p>
            </div>
        </div>
    );
}
