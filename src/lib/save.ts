// The File System Access API is only in Chromium browsers, so it is typed here
const MARKDOWN_NAME = /\.(md|markdown|mdown|mkdn|mkd|mdx|txt)$/i;

interface WritableLike {
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
    abort?: () => Promise<void>;
}

export interface FileHandle {
    createWritable: () => Promise<WritableLike>;
}

type SavePicker = (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileHandle>;

type SaveResult = "saved" | "cancelled";

/**
 * Tells whether the browser can write to a file the user picks, which makes
 * saving replace the file instead of downloading a copy.
 *
 * @returns True when showSaveFilePicker exists
 */
export function canPickFile(): boolean {
    return "showSaveFilePicker" in window;
}

/**
 * File name to propose for a document: its own, with a Markdown extension
 * when it has none.
 *
 * @param name - Name of the document, possibly with no extension
 * @returns A name ending with a Markdown or text extension
 */
function fileNameOf(name: string): string {
    const clean = name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "document";
    return MARKDOWN_NAME.test(clean) ? clean : `${clean}.md`;
}

/**
 * Downloads text as a file, for browsers that cannot write to a picked file.
 *
 * @param content - Text to put in the file
 * @param fileName - Name the browser proposes
 */
function download(content: string, fileName: string) {
    const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Saves text: in place when a file was already picked, in a file the user
 * picks when the browser allows it, or as a download otherwise.
 *
 * @param content - Text to save
 * @param name - Name of the document, used to propose a file name
 * @param handle - File picked by an earlier save, written again without asking
 * @returns The outcome and the file written, to pass back on the next save; throws when writing fails
 */
export async function saveText(
    content: string,
    name: string,
    handle?: FileHandle,
): Promise<{ result: SaveResult; handle?: FileHandle }> {
    const fileName = fileNameOf(name);
    let target = handle;

    if (!target && canPickFile()) {
        try {
            const pick = (window as unknown as { showSaveFilePicker: SavePicker })
                .showSaveFilePicker;
            target = await pick({
                suggestedName: fileName,
                types: [
                    {
                        description: "Markdown",
                        accept: {
                            "text/markdown": [".md", ".markdown", ".mdx"],
                            "text/plain": [".txt"],
                        },
                    },
                ],
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                return { result: "cancelled" };
            }
            throw error;
        }
    }

    if (!target) {
        download(content, fileName);
        return { result: "saved" };
    }

    const writable = await target.createWritable();
    try {
        await writable.write(content);
        await writable.close();
    } catch (error) {
        await writable.abort?.().catch(() => undefined);
        throw error;
    }
    return { result: "saved", handle: target };
}
