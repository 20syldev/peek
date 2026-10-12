import { setRequestLocale } from "next-intl/server";

import { Viewer } from "@/components/Viewer";
import { routing } from "@/i18n/routing";

/**
 * Home page of the default locale: the whole viewer lives on this single
 * static route. Pins the request locale for the static export.
 */
export default function Page() {
    setRequestLocale(routing.defaultLocale);
    return <Viewer />;
}
