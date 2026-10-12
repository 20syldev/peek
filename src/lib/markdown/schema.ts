import { defaultSchema, type Options as Schema } from "rehype-sanitize";

// GitHub's own allowlist adds these to the hast-util-sanitize default
const EXTRA_TAGS = [
    "abbr",
    "bdo",
    "caption",
    "cite",
    "dfn",
    "figcaption",
    "figure",
    "mark",
    "small",
    "time",
    "wbr",
];

// Raw HTML from the README is untrusted: anything outside this list is dropped
export const SCHEMA: Schema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames ?? []), ...EXTRA_TAGS],
    strip: [...(defaultSchema.strip ?? []), "style"],
    attributes: {
        ...defaultSchema.attributes,
        code: [["className", /^language-./, "math-inline", "math-display"]],
        span: [["className", "tag"]],
    },
};
