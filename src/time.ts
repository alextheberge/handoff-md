/** Resolve timestamp for HANDOFF header (deterministic when frozen). */
export function resolveTimestamp(frozenTime?: string): string {
  if (frozenTime) {
    return frozenTime.replace("T", " ").split(".")[0].replace("Z", "").trim();
  }
  const epoch = process.env.SOURCE_DATE_EPOCH;
  if (epoch) {
    const sec = Number.parseInt(epoch, 10);
    if (!Number.isNaN(sec)) {
      return new Date(sec * 1000).toISOString().replace("T", " ").split(".")[0];
    }
  }
  return new Date().toISOString().replace("T", " ").split(".")[0];
}
