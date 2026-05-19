#!/usr/bin/env node

import { runCli } from "./cli";

export { runHandoff, writeHandoff, installHook } from "./handoff";
export type { RunHandoffOptions, HandoffResult, HandoffMeta } from "./handoff";
export { renderHandoff } from "./renderer";
export { synthesizeNow } from "./synthesis/now";
export { runCheck } from "./check";
export { runInit } from "./init";
export { VERSION } from "./version";
export { HANDOFF_SPEC_VERSION, FORMAT_TOTAL_TOKEN_CAP } from "./spec";
export type { AssembledContext, FormatLevel, SectionToggles } from "./assembler";

if (require.main === module) {
  runCli();
}
