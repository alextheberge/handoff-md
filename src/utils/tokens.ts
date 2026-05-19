import { estimateTokens as heuristicEstimate } from "../assembler";

let accurateCounter: ((text: string) => number) | null = null;

try {
  // Optional peer-style dependency; falls back to heuristic if unavailable
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { encode } = require("gpt-tokenizer") as { encode: (t: string) => number[] };
  accurateCounter = (text: string) => encode(text).length;
} catch {
  accurateCounter = null;
}

export function countTokens(text: string): number {
  if (accurateCounter) {
    try {
      return accurateCounter(text);
    } catch {
      // fall through
    }
  }
  return heuristicEstimate(text);
}
