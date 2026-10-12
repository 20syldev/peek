"use client";

import { House, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { navigate } from "@/lib/navigation";

export interface ErrorPageProps {
    error: Error;
    reset: () => void;
}

/**
 * Last-resort error screen of the app: a document that breaks the renderer
 * shows this instead of a blank page, with a way back home since retrying
 * the same shared link would fail again. The heading takes focus, so
 * assistive technology announces the change.
 */
export function ErrorPage({ reset }: ErrorPageProps) {
    const t = useTranslations("error");
    const heading = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        heading.current?.focus();
    }, []);

    return (
        <main className="flex min-h-dvh items-center justify-center bg-dots p-4 text-center">
            <div className="flex flex-col items-center gap-5">
                <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
                    {t("title")}
                </h1>
                <p className="max-w-md text-muted-foreground">{t("description")}</p>
                <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="outline" onClick={reset}>
                        <RotateCcw />
                        {t("retry")}
                    </Button>
                    <Button
                        onClick={() => {
                            navigate("");
                            reset();
                        }}
                    >
                        <House />
                        {t("home")}
                    </Button>
                </div>
            </div>
        </main>
    );
}
