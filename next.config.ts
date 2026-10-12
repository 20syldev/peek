import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
    output: process.env.NODE_ENV === "production" ? "export" : undefined,
    trailingSlash: true,
    images: { unoptimized: true },
    experimental: { globalNotFound: true },
    turbopack: {
        root: process.cwd(),
        resolveAlias: {
            "decode-named-character-reference":
                "./node_modules/decode-named-character-reference/index.js",
        },
    },
};

export default withNextIntl(nextConfig);
