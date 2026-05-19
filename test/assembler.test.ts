import { describe, expect, it } from "vitest";
import { estimateTokens, getBudget, truncateToTokenBudget } from "../src/assembler";

describe("assembler", () => {
  it("estimateTokens uses char heuristic", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(8))).toBe(2);
  });

  it("truncateToTokenBudget keeps short text", () => {
    expect(truncateToTokenBudget("hello", 100)).toBe("hello");
  });

  it("truncateToTokenBudget adds marker when over budget", () => {
    const long = "line\n".repeat(200);
    const out = truncateToTokenBudget(long, 10);
    expect(out).toContain("...truncated");
  });

  it("getBudget returns format-specific budgets", () => {
    expect(getBudget("compact").stack).toBe(150);
    expect(getBudget("full").stack).toBe(250);
  });
});
