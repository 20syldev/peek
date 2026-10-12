import { setRequestLocale } from "next-intl/server";

import { Viewer } from "@/components/Viewer";

/**
 * Home page of a non-default locale. Pins the request locale for the static
 * export, then renders the viewer.
 *
 * @param params - Route params carrying the locale segment
 */
export default async function LocalePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <Viewer />;
}
