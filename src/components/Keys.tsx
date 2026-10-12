"use client";

import { useTranslations } from "next-intl";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { type ShortcutId, SHORTCUTS } from "@/data/shortcuts";
import { useModKey } from "@/hooks/useModKey";

// Keys that are named, not printed
const NAMED_KEYS = new Set(["Escape", "Enter"]);

export interface KeysProps {
    shortcut: ShortcutId;
    withAlt?: boolean;
    className?: string;
}

/**
 * Key combination of a shortcut, as keycaps; the modifier reads Cmd on Apple
 * platforms and Ctrl elsewhere. With withAlt, the alternative character of the
 * shortcut follows, when it has one.
 */
export function Keys({ shortcut, withAlt = false, className }: KeysProps) {
    const t = useTranslations("keys");
    const mod = useModKey();
    const definition = SHORTCUTS.find((item) => item.id === shortcut);
    if (!definition) return null;

    const combination = (character: string) => {
        const key = NAMED_KEYS.has(character) ? t(character) : character.toUpperCase();
        return definition.mod ? [mod, key] : [key];
    };
    const combinations = [combination(definition.key)];
    if (withAlt && definition.alt) combinations.push(combination(definition.alt));

    return (
        <KbdGroup className={className}>
            {combinations.map((keys, index) => (
                <KbdGroup key={keys.join("+")}>
                    {index > 0 ? (
                        <span className="text-xs text-muted-foreground">{t("or")}</span>
                    ) : null}
                    {keys.map((label) => (
                        <Kbd
                            key={label}
                            className="border border-b-2 bg-card font-mono text-[11px] text-foreground"
                        >
                            {label}
                        </Kbd>
                    ))}
                </KbdGroup>
            ))}
        </KbdGroup>
    );
}
