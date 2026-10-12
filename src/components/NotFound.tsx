"use client";

import { House } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { type AppLocale, localePath, routing } from "@/i18n/routing";

export interface NotFoundCopy {
    title: string;
    description: string;
    back: string;
}

export interface NotFoundProps {
    copy: Record<AppLocale, NotFoundCopy>;
}

/**
 * The 404 document never navigates, so there is nothing to subscribe to.
 *
 * @returns A no-op unsubscribe function
 */
function subscribe() {
    return () => {};
}

/**
 * Locale of the current address: its first path segment when that is a known
 * prefix, else the default locale served at the root.
 *
 * @returns The locale to show the page in
 */
function getLocale(): AppLocale {
    const segment = window.location.pathname.split("/")[1];
    return (routing.locales as readonly string[]).includes(segment)
        ? (segment as AppLocale)
        : routing.defaultLocale;
}

/**
 * Locale of the server HTML, which is built in the default locale.
 *
 * @returns The default locale
 */
function getServerLocale(): AppLocale {
    return routing.defaultLocale;
}

/**
 * 404 page, the shared sylvain.sh template: exported as out/404.html, which
 * GitHub Pages serves for any unknown path. A static export serves one 404
 * document for every path, so its locale is resolved on the client from the
 * URL prefix, with the copy of every locale handed over by the server.
 *
 * @param copy - Title, description and back label, keyed by locale
 */
export function NotFound({ copy }: NotFoundProps) {
    const locale = useSyncExternalStore(subscribe, getLocale, getServerLocale);
    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);
    const text = copy[locale];

    return (
        <main className="flex min-h-dvh items-center justify-center bg-dots p-4 text-center">
            <div className="flex animate-in flex-col items-center gap-6 duration-500 fade-in slide-in-from-bottom-2">
                <p
                    aria-hidden="true"
                    className="text-[clamp(6rem,20vw,8rem)] leading-none font-bold text-muted-foreground/30"
                >
                    404
                </p>
                <h1 className="text-2xl font-semibold">{text.title}</h1>
                <p className="max-w-md text-muted-foreground">{text.description}</p>
                <Button asChild>
                    <a href={localePath(locale)}>
                        <House />
                        {text.back}
                    </a>
                </Button>
            </div>
        </main>
    );
}
