/** HANDOFF output spec version — bump when section schema changes. */
export const HANDOFF_SPEC_VERSION = 2;

export const FORMAT_TOTAL_TOKEN_CAP: Record<"compact" | "standard" | "full", number> = {
  compact: 1500,
  standard: 3000,
  full: 5000,
};
