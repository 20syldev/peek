"use client";

import { useTranslations } from "next-intl";
import type { Ref } from "react";

export interface EditorProps {
    ref?: Ref<HTMLTextAreaElement>;
    value: string;
    onChange: (value: string) => void;
}

/**
 * Plain text area for the Markdown source. It takes focus when it appears and
 * leaves Tab to the browser, so the keyboard is never trapped in it.
 */
export function Editor({ ref, value, onChange }: EditorProps) {
    const t = useTranslations("reader");

    return (
        <textarea
            ref={ref}
            autoFocus
            value={value}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={t("editorLabel")}
            onChange={(event) => onChange(event.target.value)}
            className="block h-full min-h-[60dvh] w-full resize-none rounded-xl rounded-tl-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:p-6 lg:min-h-0 lg:rounded-r-none"
        />
    );
}
