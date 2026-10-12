import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
    locales: ["en", "fr"],
    defaultLocale: "en",
    localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];

// Where the language chosen with the switcher is remembered, read back by the detection script
export const LOCALE_KEY = "locale";

/**
 * Address of the home page of a locale: the default one lives at the root,
 * the others under their prefix.
 *
 * @param locale - Target locale
 * @returns The path, always with a leading and a trailing slash
 */
export function localePath(locale: string): string {
    return locale === routing.defaultLocale ? "/" : `/${locale}/`;
}
