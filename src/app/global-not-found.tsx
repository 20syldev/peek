import { getMessages, setRequestLocale } from "next-intl/server";

import { NotFound, type NotFoundCopy } from "@/components/NotFound";
import { Shell } from "@/components/Shell";
import { type AppLocale, routing } from "@/i18n/routing";
import { buildMetadata, VIEWPORT } from "@/lib/metadata";

export const viewport = VIEWPORT;

/**
 * Metadata of the 404 document, in the default locale.
 *
 * @returns Metadata for the document head
 */
export function generateMetadata() {
    return buildMetadata(routing.defaultLocale);
}

/**
 * Global 404, rendered for any unmatched route. Each locale lives in its own
 * route group with its own root layout, so no layout wraps the not-found
 * page: it owns the whole document through the Shell (see
 * experimental.globalNotFound in next.config).
 *
 * A static export serves a single 404 document for every path, so it renders
 * in the default locale and hands the client every locale's copy to pick
 * from the URL. A new locale needs only its messages file.
 */
export default async function GlobalNotFound() {
    setRequestLocale(routing.defaultLocale);
    const messages = await getMessages({ locale: routing.defaultLocale });
    const entries = await Promise.all(
        routing.locales.map(
            async (locale) =>
                [locale, (await import(`../../messages/${locale}.json`)).default.notFound] as [
                    AppLocale,
                    NotFoundCopy,
                ],
        ),
    );
    const copy = Object.fromEntries(entries) as Record<AppLocale, NotFoundCopy>;
    return (
        <Shell locale={routing.defaultLocale} messages={messages}>
            <NotFound copy={copy} />
        </Shell>
    );
}
