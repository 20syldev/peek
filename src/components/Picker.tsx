"use client";

import { CircleAlert, Link as LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type RefObject, useState } from "react";

import { Dropzone } from "@/components/Dropzone";
import { Keys } from "@/components/Keys";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface PickerProps {
    error?: string;
    input?: string;
    dragging: boolean;
    urlRef: RefObject<HTMLInputElement | null>;
    onBrowse: () => void;
    onUrl: (url: string) => void;
    onText: (text: string) => void;
}

interface UrlFormProps {
    input?: string;
    invalid: boolean;
    urlRef: RefObject<HTMLInputElement | null>;
    onUrl: (url: string) => void;
}

interface PasteFormProps {
    onCancel: () => void;
    onText: (text: string) => void;
}

/**
 * Link field of the home card; Enter or the button loads the link.
 *
 * @param input - Link of the last attempt, used as default value and as form key so it resets
 * @param invalid - Whether the last attempt failed, which ties the field to the error alert
 * @param urlRef - Ref to the field, focused by the "/" shortcut
 * @param onUrl - Receives the submitted text, untrimmed
 */
function UrlForm({ input, invalid, urlRef, onUrl }: UrlFormProps) {
    const t = useTranslations("home");
    return (
        <form
            key={input}
            className="flex flex-wrap gap-2 border-t p-2"
            onSubmit={(event) => {
                event.preventDefault();
                onUrl(String(new FormData(event.currentTarget).get("url") ?? ""));
            }}
        >
            <label htmlFor="url" className="sr-only">
                {t("linkLabel")}
            </label>
            <div className="relative flex min-w-64 flex-1 items-center">
                <LinkIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
                />
                <Input
                    ref={urlRef}
                    id="url"
                    name="url"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    defaultValue={input}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? "url-error" : undefined}
                    placeholder={t("linkPlaceholder")}
                    className="h-10 bg-card pr-10 pl-9 font-mono text-sm dark:bg-card"
                />
                <Keys shortcut="focusUrl" className="pointer-events-none absolute right-2.5" />
            </div>
            <Button type="submit" className="h-10 px-4">
                {t("load")}
            </Button>
        </form>
    );
}

/**
 * Text area replacing the card content to render pasted Markdown;
 * Ctrl or Cmd + Enter submits it.
 *
 * @param onCancel - Brings the drop zone and the link field back
 * @param onText - Receives the typed Markdown, never blank
 */
function PasteForm({ onCancel, onText }: PasteFormProps) {
    const t = useTranslations("home");
    const [text, setText] = useState("");
    const submit = () => {
        if (text.trim()) onText(text);
    };

    return (
        <form
            className="flex flex-col gap-2 p-2"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <label htmlFor="markdown" className="sr-only">
                {t("markdownLabel")}
            </label>
            <Textarea
                id="markdown"
                autoFocus
                rows={10}
                value={text}
                spellCheck={false}
                placeholder={t("markdownPlaceholder")}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
                    event.preventDefault();
                    submit();
                }}
                className="max-h-[50vh] min-h-48 resize-y bg-card font-mono text-sm dark:bg-card"
            />
            <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    {t("cancel")}
                </Button>
                <Button type="submit" disabled={!text.trim()}>
                    {t("show")}
                    <Keys shortcut="submitText" className="opacity-70" />
                </Button>
            </div>
        </form>
    );
}

/**
 * Home screen: a drop target and a link field in a single card, with pasted
 * Markdown as a secondary path. The heading carries the hanging "#" that
 * gives the app its identity.
 */
export function Picker({ error, input, dragging, urlRef, onBrowse, onUrl, onText }: PickerProps) {
    const t = useTranslations("home");
    const errors = useTranslations("errors");
    const [pasting, setPasting] = useState(false);

    return (
        <main className="flex flex-1 items-center justify-center px-4 py-20 sm:px-6">
            <div className="flex w-full max-w-xl flex-col gap-7">
                <div className="flex flex-col gap-3.5">
                    <h1 className="relative text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-[2.75rem]">
                        <span
                            aria-hidden="true"
                            className="absolute right-full mr-4 hidden font-mono font-normal text-brand md:inline"
                        >
                            #
                        </span>
                        {t("title")}
                    </h1>
                    <p className="text-lg leading-relaxed text-muted-foreground">{t("subtitle")}</p>
                </div>

                <section className="flex flex-col gap-0 rounded-xl border bg-card p-2 shadow-[0_1px_2px_rgb(0_0_0/4%),0_12px_32px_-16px_rgb(0_0_0/12%)]">
                    {pasting ? (
                        <PasteForm onCancel={() => setPasting(false)} onText={onText} />
                    ) : (
                        <>
                            <Dropzone dragging={dragging} onBrowse={onBrowse} />
                            <div className="mt-2">
                                <UrlForm
                                    input={input}
                                    invalid={Boolean(error)}
                                    urlRef={urlRef}
                                    onUrl={onUrl}
                                />
                            </div>
                        </>
                    )}
                </section>

                {error ? (
                    <Alert id="url-error" variant="destructive" className="bg-card">
                        <CircleAlert />
                        <AlertTitle>{errors("cannotDisplay")}</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : null}

                {pasting ? null : (
                    <button
                        type="button"
                        onClick={() => setPasting(true)}
                        className="mx-auto flex items-center gap-2 rounded-md text-sm text-muted-foreground underline decoration-input underline-offset-4 outline-none hover:text-foreground hover:decoration-brand focus-visible:ring-[3px] focus-visible:ring-ring"
                    >
                        {t("paste")}
                        <Keys shortcut="paste" />
                    </button>
                )}
            </div>
        </main>
    );
}
