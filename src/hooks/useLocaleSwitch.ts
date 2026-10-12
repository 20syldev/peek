import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useCallback } from "react";

import { type AppLocale, LOCALE_KEY, localePath, routing } from "@/i18n/routing";

/**
 * Language of the page and the way to change it. Each language is its own
 * root document, so switching is a full navigation to the home of the
 * target locale; the query string and the hash follow, which reopens a
 * remote document. The choice is remembered for the next visit.
 *
 * @returns The current locale, a setter, and a function that cycles to the next locale
 */
export function useLocaleSwitch() {
    const locale = useLocale() as AppLocale;
    const router = useRouter();

    const setLocale = useCallback(
        (next: string) => {
            try {
                window.localStorage.setItem(LOCALE_KEY, next);
            } catch {
                // Remembering the choice is best-effort only
            }
            const { search, hash } = window.location;
            router.push(`${localePath(next)}${search}${hash}`);
        },
        [router],
    );

    const cycle = useCallback(() => {
        const index = routing.locales.indexOf(locale);
        setLocale(routing.locales[(index + 1) % routing.locales.length]);
    }, [locale, setLocale]);

    return { locale, setLocale, cycle };
}
