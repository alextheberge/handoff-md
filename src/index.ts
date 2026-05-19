#!/usr/bin/env node

import { runCli } from "./cli";

export { runHandoff, writeHandoff, installHook } from "./handoff";
export type { RunHandoffOptions, HandoffResult, HandoffMeta } from "./handoff";
export { renderHandoff } from "./renderer";
export { VERSION } from "./version";
export { HANDOFF_SPEC_VERSION } from "./spec";
export type { AssembledContext, FormatLevel, SectionToggles } from "./assembler";

if (require.main === module) {
  runCli();
}
