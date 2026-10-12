import { getMessages, setRequestLocale } from "next-intl/server";

import { Shell } from "@/components/Shell";
import { routing } from "@/i18n/routing";
import { buildMetadata, VIEWPORT } from "@/lib/metadata";

export const viewport = VIEWPORT;

/**
 * Document metadata for the default locale.
 *
 * @returns Metadata for the document head
 */
export function generateMetadata() {
    return buildMetadata(routing.defaultLocale);
}

/**
 * Root layout of the default locale, served at "/". The other locales live
 * under the sibling [locale] segment; keeping the default unprefixed is why it
 * has its own root layout. Only this one sends visitors to their language.
 *
 * @param children - Page tree rendered inside the shell
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
    setRequestLocale(routing.defaultLocale);
    const messages = await getMessages({ locale: routing.defaultLocale });
    return (
        <Shell locale={routing.defaultLocale} messages={messages} detect>
            {children}
        </Shell>
    );
}
