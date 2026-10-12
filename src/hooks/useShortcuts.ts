import { useEffect, useEffectEvent } from "react";

import { type Shortcut, type ShortcutId, SHORTCUTS } from "@/data/shortcuts";
import { usePreference } from "@/hooks/usePreference";

export type ShortcutHandlers = Partial<Record<ShortcutId, () => void>>;

// Stored as "off" when the user disables single-key shortcuts (WCAG 2.1.4)
export const SINGLE_KEYS_KEY = "peek.singleKeys";

/**
 * Tells whether keyboard input currently goes to a text field.
 *
 * @param target - Event target of the key press
 * @returns True for inputs, textareas, selects and editable content
 */
function isEditable(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Tells whether a dialog, menu or popover is open; single-key shortcuts and
 * Escape belong to it while it is.
 *
 * @returns True when a Radix overlay is open
 */
function overlayOpen(): boolean {
    return document.querySelector('[role="dialog"], [role="menu"]') !== null;
}

/**
 * Matches a key press against a shortcut definition. Letter shortcuts never
 * match while Shift is held; symbols such as "?" are compared on the produced
 * character, whatever the keyboard layout; a shortcut can have one alternative
 * character, for keys that produce another symbol on some layouts.
 *
 * @param event - Keydown event, already filtered for composition and defaultPrevented
 * @param shortcut - Definition from the shortcut catalog
 * @returns True when the press triggers the shortcut
 */
function matches(event: KeyboardEvent, shortcut: Shortcut): boolean {
    const mod = event.ctrlKey || event.metaKey;
    if (mod !== Boolean(shortcut.mod) || event.altKey) return false;
    const key = event.key.toLowerCase();
    if (key !== shortcut.key.toLowerCase() && key !== shortcut.alt?.toLowerCase()) return false;
    return !/^[a-z]$/i.test(shortcut.key) || !event.shiftKey;
}

/**
 * Binds the keyboard shortcuts of the catalog that have a handler; several
 * components can each bind their own subset. Shortcuts without Ctrl or Cmd
 * fire only outside text fields and while no overlay is open; character keys
 * can also be turned off by the user. Ctrl or Cmd shortcuts fire everywhere.
 *
 * @param handlers - Action for each shortcut this component owns
 */
export function useShortcuts(handlers: ShortcutHandlers) {
    const [singleKeys] = usePreference(SINGLE_KEYS_KEY);

    const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
        if (event.defaultPrevented || event.isComposing) return;

        for (const shortcut of SHORTCUTS) {
            const handler = handlers[shortcut.id];
            if (!handler || shortcut.passive || !matches(event, shortcut)) continue;
            if (singleKeys === "off" && !shortcut.mod && shortcut.key.length === 1) return;
            if (!shortcut.mod && (isEditable(event.target) || overlayOpen())) return;

            event.preventDefault();
            handler();
            return;
        }
    });

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
}

/**
 * Handles pastes made outside text fields: a copied file, or text that is
 * either a link to load or Markdown to render.
 *
 * @param onFile - Receives a pasted file
 * @param onText - Receives pasted text
 */
export function usePaste(onFile: (file: File) => void, onText: (text: string) => void) {
    const onPaste = useEffectEvent((event: ClipboardEvent) => {
        if (isEditable(event.target) || overlayOpen() || !event.clipboardData) return;

        const file = event.clipboardData.files[0];
        const text = event.clipboardData.getData("text/plain");
        if (!file && !text.trim()) return;

        event.preventDefault();
        if (file) onFile(file);
        else onText(text);
    });

    useEffect(() => {
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, []);
}
