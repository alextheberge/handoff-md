import type { FormatLevel, SectionToggles } from "./assembler";
import { DEFAULT_SECTIONS } from "./assembler";

export type ProfileName = "default" | "cursor" | "ci" | "pr";

export interface ProfileSettings {
  format?: FormatLevel;
  sections?: Partial<SectionToggles>;
  shrinkLevel?: number;
}

const PROFILES: Record<ProfileName, ProfileSettings> = {
  default: {},
  cursor: {
    sections: {
      conventions: true,
      notes: true,
      scripts: true,
      structure: true,
      stack: true,
      now: true,
      workspace: false,
      ci: false,
    },
  },
  ci: {
    format: "compact",
    shrinkLevel: 1,
    sections: {
      stack: true,
      scripts: true,
      ci: true,
      now: true,
      structure: false,
      conventions: false,
      workspace: false,
      git: false,
      todos: false,
    },
  },
  pr: {
    sections: {
      now: true,
      git: true,
      todos: true,
      github: true,
      structure: false,
      workspace: false,
      ci: false,
      scripts: false,
    },
    shrinkLevel: 0,
  },
};

export function isKnownProfile(name: string): boolean {
  return name === "default" || name in PROFILES;
}

export function resolveProfile(name?: string): ProfileSettings {
  if (!name || name === "default") return {};
  if (name in PROFILES) return PROFILES[name as ProfileName];
  return {};
}

export function applyProfile(sections: SectionToggles, profile: ProfileSettings): SectionToggles {
  return { ...sections, ...profile.sections };
}

export function mergeProfileSections(base: SectionToggles, profileName?: string): SectionToggles {
  const profile = resolveProfile(profileName);
  return applyProfile(base, profile);
}
