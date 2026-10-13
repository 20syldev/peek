import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Line widths of the placeholder paragraph, as Tailwind classes.
 */
const LINES = ["w-11/12", "w-full", "w-10/12", "w-9/12", "w-full", "w-7/12"];

export interface ReaderSkeletonProps {
    name?: string;
}

/**
 * Placeholder sheet shown while a document is fetched or the reader code
 * loads, shaped like the reader so nothing jumps when it arrives.
 */
export function ReaderSkeleton({ name }: ReaderSkeletonProps) {
    const t = useTranslations("reader");
    return (
        <main
            aria-busy="true"
            aria-label={t("loading")}
            className="mx-auto flex w-full max-w-[70rem] flex-1 px-3 pt-3 pb-12 sm:px-6 md:pt-16"
        >
            <div className="min-w-0 flex-1">
                <div aria-hidden="true" className="mb-2 h-10 md:hidden" />
                <div className="relative top-px inline-flex items-center gap-2 rounded-t-[10px] border border-b-0 bg-card px-4 pt-2.5 pb-[11px] font-mono text-[13px] font-medium">
                    <FileText aria-hidden="true" className="size-[15px] text-brand" />
                    {name ?? t("loadingShort")}
                </div>
                <div className="flex animate-pulse flex-col gap-4 rounded-xl rounded-tl-none border bg-card px-5 py-8 sm:px-10 md:pr-14 md:pl-20">
                    <div className="h-8 w-1/2 rounded-md bg-muted" />
                    {LINES.map((width, index) => (
                        <div key={index} className={`h-4 rounded bg-muted ${width}`} />
                    ))}
                </div>
            </div>
        </main>
    );
}
