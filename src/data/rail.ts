export type RailWidth = "narrow" | "normal" | "wide";

// Widths the outline rail steps through, from the one it starts with to the widest
export const RAIL_WIDTHS: Record<RailWidth, string> = {
    narrow: "14rem",
    normal: "18rem",
    wide: "22rem",
};
