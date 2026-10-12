import { JetBrains_Mono, Outfit } from "next/font/google";
import { type AbstractIntlMessages, NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";

import { TooltipProvider } from "@/components/ui/tooltip";
import { type AppLocale, LOCALE_KEY, localePath, routing } from "@/i18n/routing";

import "@/app/globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export interface ShellProps {
    locale: AppLocale;
    messages: AbstractIntlMessages;
    detect?: boolean;
    children: React.ReactNode;
}

/**
 * Inline script, first in the body so it runs before anything is painted, that sends a visitor of the
 * unprefixed home to the language they chose with the switcher, or else the
 * first language of their browser that the app speaks. The query string and
 * the hash follow, so a shared link still opens its document.
 */
const DETECT_SCRIPT = `(function () {
    try {
        var locales = ${JSON.stringify(routing.locales)};
        var found = localStorage.getItem(${JSON.stringify(LOCALE_KEY)});
        if (locales.indexOf(found) < 0) {
            found = null;
            var wanted = navigator.languages || [navigator.language];
            for (var i = 0; i < wanted.length && !found; i++) {
                var code = String(wanted[i]).toLowerCase().split("-")[0];
                if (locales.indexOf(code) >= 0) found = code;
            }
        }
        if (found && found !== ${JSON.stringify(routing.defaultLocale)}) {
            location.replace("/" + found + "/" + location.search + location.hash);
        }
    } catch (error) {}
})();`;

/**
 * Root document shared by every locale: html lang, fonts, theme, tooltip and
 * intl providers. Each locale route group renders it with its own messages,
 * so the default locale can live at "/" and the others under a prefix.
 *
 * @param locale - Active locale, used for the html lang attribute
 * @param messages - Translated messages handed to the client provider
 * @param detect - Whether to send visitors to their language, only wanted on the unprefixed home
 * @param children - Page tree for this locale
 */
export function Shell({ locale, messages, detect = false, children }: ShellProps) {
    return (
        <html
            lang={locale}
            suppressHydrationWarning
            className={`${outfit.variable} ${jetbrainsMono.variable}`}
        >
            <body className="min-h-dvh font-sans antialiased">
                {detect && localePath(locale) === "/" ? (
                    <script dangerouslySetInnerHTML={{ __html: DETECT_SCRIPT }} />
                ) : null}
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <NextIntlClientProvider locale={locale} messages={messages}>
                        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
                    </NextIntlClientProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
