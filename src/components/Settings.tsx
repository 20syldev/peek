"use client";

import { CodeXml, Keyboard, Monitor, Moon, Settings2, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { Keys } from "@/components/Keys";
import { type PillOption, Pills } from "@/components/Pills";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ShortcutId } from "@/data/shortcuts";
import { useLocaleSwitch } from "@/hooks/useLocaleSwitch";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const REPOSITORY = "https://github.com/20syldev/peek";

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };

const ITEM =
    "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4";

export interface SettingsProps {
    onShortcuts: () => void;
}

interface TipProps {
    label: string;
    shortcut?: ShortcutId;
    children: React.ReactNode;
}

/**
 * Name of a language in that language, so the switcher needs no translated labels.
 *
 * @param code - Language code of a locale
 * @returns The autonym with its first letter capitalized
 */
function autonym(code: string): string {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
    return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * The store never changes; it only tells the server render from the client.
 *
 * @returns A no-op unsubscribe function
 */
function subscribe() {
    return () => {};
}

/**
 * Tooltip under a pill button, with the shortcut when there is one.
 *
 * @param label - Tooltip text, also the accessible name given by the caller
 * @param shortcut - Catalog shortcut shown after the text, omitted when the action has none
 * @param children - Pill button that triggers the tooltip; it must forward its ref (asChild)
 */
function Tip({ label, shortcut, children }: TipProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
                {label}
                {shortcut ? <Keys shortcut={shortcut} /> : null}
            </TooltipContent>
        </Tooltip>
    );
}

/**
 * Settings pill in the top right corner, in place of a header: it unfolds on
 * hover, or pinned by a click on its icon (the way on touch screens), and
 * folds back on a second click, Escape, a click elsewhere or when focus
 * leaves it. Folded buttons are inert, so focus goes back to the toggle first.
 */
export function Settings({ onShortcuts }: SettingsProps) {
    const t = useTranslations("settings");
    const { theme, setTheme } = useTheme();
    const { locale, setLocale } = useLocaleSwitch();
    const themes = useMemo<PillOption<string>[]>(
        () =>
            (Object.keys(THEME_ICONS) as (keyof typeof THEME_ICONS)[]).map((value) => ({
                value,
                label: t(`theme.${value}`),
                icon: THEME_ICONS[value],
            })),
        [t],
    );
    const languages = useMemo<PillOption<string>[]>(
        () =>
            routing.locales.map((code) => ({
                value: code,
                label: code.toUpperCase(),
                description: autonym(code),
            })),
        [],
    );
    const mounted = useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );
    const [hovered, setHovered] = useState(false);
    const [pinned, setPinned] = useState(false);
    const root = useRef<HTMLElement>(null);
    const toggle = useRef<HTMLButtonElement>(null);
    const leaveTimer = useRef<number | undefined>(undefined);
    const open = hovered || pinned;

    const focusInside = () => root.current?.contains(document.activeElement) ?? false;

    const fold = () => {
        if (focusInside()) toggle.current?.focus();
        setPinned(false);
        setHovered(false);
    };

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (root.current?.contains(event.target as Node)) return;
            setPinned(false);
            setHovered(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

    return (
        <header
            ref={root}
            aria-label={t("label")}
            className="fixed top-3 right-3 z-40 flex flex-row-reverse items-center rounded-full bg-card/90 p-1 shadow-[0_1px_2px_rgb(0_0_0/6%),0_8px_24px_-12px_rgb(0_0_0/25%)] backdrop-blur print:hidden"
            onPointerEnter={(event) => {
                if (event.pointerType !== "mouse") return;
                window.clearTimeout(leaveTimer.current);
                setHovered(true);
            }}
            onPointerLeave={(event) => {
                if (event.pointerType !== "mouse") return;
                leaveTimer.current = window.setTimeout(() => {
                    if (!focusInside()) setHovered(false);
                }, 250);
            }}
            onBlur={(event) => {
                if (event.relatedTarget && root.current?.contains(event.relatedTarget as Node))
                    return;
                if (!pinned && !root.current?.matches(":hover")) setHovered(false);
            }}
            onKeyDown={(event) => {
                if (event.key !== "Escape" || event.defaultPrevented || !open) return;
                event.stopPropagation();
                fold();
            }}
        >
            <button
                ref={toggle}
                type="button"
                aria-label={t("label")}
                aria-expanded={open}
                aria-controls="settings-panel"
                onClick={() => (pinned ? fold() : setPinned(true))}
                className={cn(ITEM, open && "text-foreground")}
            >
                <Settings2 />
            </button>
            <div
                id="settings-panel"
                inert={!open}
                className={cn(
                    "-my-1 flex items-center gap-1 overflow-hidden py-1 transition-[max-width,opacity,margin,padding,transform] duration-200 ease-out motion-reduce:transition-none",
                    open ? "mr-1 max-w-96 px-1 opacity-100" : "max-w-0 px-0 opacity-0",
                    // On small screens the panel drops below the toggle as a card, so it never covers the page controls
                    "max-sm:absolute max-sm:top-full max-sm:right-0 max-sm:m-0 max-sm:mt-2 max-sm:max-w-none max-sm:rounded-2xl max-sm:border max-sm:bg-card max-sm:p-1.5 max-sm:shadow-lg",
                    open
                        ? "max-sm:translate-y-0"
                        : "max-sm:pointer-events-none max-sm:-translate-y-1",
                )}
            >
                <Pills
                    label={t("theme.label")}
                    options={themes}
                    value={mounted ? theme : undefined}
                    onChange={setTheme}
                />
                <Pills
                    label={t("language")}
                    options={languages}
                    value={locale}
                    onChange={setLocale}
                />
                <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
                <Tip label={t("shortcuts")} shortcut="help">
                    <button
                        type="button"
                        aria-label={t("shortcuts")}
                        onClick={onShortcuts}
                        className={cn(ITEM, "max-sm:hidden")}
                    >
                        <Keyboard />
                    </button>
                </Tip>
                <Tip label={t("source")}>
                    <a
                        href={REPOSITORY}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("source")}
                        className={ITEM}
                    >
                        <CodeXml />
                    </a>
                </Tip>
            </div>
        </header>
    );
}
