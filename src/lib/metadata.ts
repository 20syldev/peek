import type { Metadata, Viewport } from "next";
import { getTranslations } from "next-intl/server";

import { THEME_COLORS } from "@/data/theme";
import { type AppLocale, localePath, routing } from "@/i18n/routing";

const SITE = "https://peek.sylvain.sh";

export const VIEWPORT: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
        { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
    ],
};

/**
 * Builds the localized document metadata from the "meta" message namespace,
 * with the alternate address of each language.
 *
 * @param locale - Target locale
 * @returns Title, description, social card and language alternates for the document head
 */
export async function buildMetadata(locale: AppLocale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: "meta" });
    const title = t("title");
    const description = t("description");
    const languages = Object.fromEntries(routing.locales.map((code) => [code, localePath(code)]));

    return {
        metadataBase: new URL(SITE),
        title,
        description,
        alternates: { canonical: localePath(locale), languages },
        openGraph: {
            title,
            description,
            url: localePath(locale),
            type: "website",
            locale,
        },
    };
}
