# Peek

Markdown viewer that shows any README, from a local file, a link or pasted text, rendered the way GitHub, GitLab, Obsidian or CommonMark would. Everything runs in the browser, nothing is sent to a server.

## Features

- Three ways in: drop a `.md` file anywhere on the page, pick one, or paste a link, a file or text (`Ctrl V`).
- GitHub links converted to the raw file: whole repository, folder, blob, raw view or gist; any other http(s) link is fetched as is if its server allows it (CORS).
- Shareable link, `?url=github.com/20syldev/peek&flavor=gitlab`, that keeps the browser history; relative links and images are resolved against the source, as in the repository.
- Four Markdown flavors, picked in the document tab and remembered:
    - GitHub: GFM (tables, task lists, footnotes), alerts, math, Mermaid, emojis, front matter table.
    - GitLab: GFM, `[[_TOC_]]`, `>>>` quotes, inline diff, math, Mermaid, front matter code block.
    - Obsidian: callouts with title and folding, `==highlight==`, wiki links, `![[image]]` embeds, `#tags`, `%%comments%%`.
    - CommonMark: the standard alone.
- Raw Markdown view next to the rendering (`R`).
- Editor (`E`): the source on the left and a live preview on the right, scrolling together by source line, or an Edit / Preview switch on small screens. `Ctrl S` saves into the file you pick (File System Access API, Chromium) or downloads a `.md` copy, keeping its line breaks.
- Unsaved edits are kept as a draft in this browser, offered again when the same document is opened, and dropped once saved in place.
- Outline on the side with the current section, whose width adapts to long headings, and a `#` anchor on every heading.
- Sanitized HTML on GitHub's allowed-elements list: no script, no style, no `javascript:` link.
- Rendering in a Web Worker with an 8 second limit: a heavy or booby-trapped document never freezes the page.
- English and French, picked from the browser language and remembered; light / dark / system theme (next-themes); design driven solely by the tokens in `src/app/appearance/`.
- Keyboard shortcuts, with a switch to turn the single-key ones off (WCAG 2.1.4); clean print and PDF export.

## Stack

Next.js 16 (App Router, static export), React 19, strict TypeScript, Tailwind CSS v4, shadcn/ui (new-york, Radix primitives via `radix-ui`), next-intl, next-themes, unified (remark, rehype), KaTeX, highlight.js, Mermaid, lucide-react

## Scripts

| Script           | Description                                |
| ---------------- | ------------------------------------------ |
| `npm run dev`    | Dev server on `127.0.0.1:4197`             |
| `npm run build`  | Production build (static export to `out/`) |
| `npm run start`  | Serve `out/` on port 4198                  |
| `npm run lint`   | ESLint                                     |
| `npm run check`  | `tsc --noEmit` + ESLint + Prettier (check) |
| `npm run format` | Prettier + ESLint (write)                  |

## Structure

```
messages/                 i18n messages (en.json, fr.json)
src/app/(site)/           Root layout + page for the default locale, served at /
src/app/[locale]/         Root layout + page for the other locales, served at /fr/
src/app/appearance/       Light, dark and print palettes (design tokens)
src/app/markdown.css      Style of the rendered document and its syntax colors
src/components/           Viewer, picker, settings pill, shortcuts dialog, shell
src/components/reader/    Document screen: file tab, outline, skeleton
src/components/markdown/  Rendered elements: headings, code, callouts, Mermaid
src/components/ui/        Generated shadcn/ui components
src/data/                 Markdown flavors, shortcut catalog, theme colors
src/hooks/                Document state, rendering, shortcuts, preferences, locale
src/i18n/                 next-intl routing and request
src/lib/                  Source resolution, loading, navigation, metadata, Markdown pipeline and worker
```

## Notes

- Static export: no middleware, `localePrefix: "as-needed"`. English is served at `/`, French at `/fr/`; each locale is a distinct root layout sharing the `Shell` component. On `/`, a small inline script sends the visitor to the language saved by the switcher, or else the first supported browser language, keeping `?url=` and the hash. Share links always point to `/`, so each recipient gets their own language.
- Adding a language: add its code to `src/i18n/routing.ts` and its file to `messages/`.
- Keyboard shortcuts: `Ctrl /` (all shortcuts, also `Ctrl :` for AZERTY keyboards), `Ctrl O` (open), `Ctrl V` (paste), `Ctrl P` (print), `/` (link field), `S` (outline), `C` (copy share link), `R` (raw Markdown), `E` (edit), `Ctrl S` (save, while editing), `D` (theme), `L` (language), `Esc` (close).
- The rendering worker uses a Turbopack `resolveAlias` for `decode-named-character-reference`, so its DOM build is never bundled into the worker.
- Version 1 was one HTML page, one stylesheet and one script. Next.js replaces three duplicated stylesheets with Tailwind tokens, hand-made DOM code with typed `.tsx`, and an unsanitized `innerHTML` with a unified pipeline that sanitizes first; the static export still fits GitHub Pages, at the cost of a build step.
