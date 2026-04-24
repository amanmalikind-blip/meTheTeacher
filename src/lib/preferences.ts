"use client";

import {
  CHARACTERS,
  LANGUAGES,
  LEVELS,
  TEACHING_STYLES,
  type CharacterId,
  type LanguageId,
  type LevelId,
  type TeachingStyleId
} from "./constants";

const PREFS_KEY = "mtt.prefs.v1";
const STYLE_COUNTS_KEY = "mtt.styleCounts.v1";

export type Preferences = {
  level: LevelId;
  style: TeachingStyleId;
  character: CharacterId;
  language: LanguageId;
  voiceURI?: string;
};

const DEFAULTS: Preferences = {
  level: "beginner",
  style: "analogies",
  character: "friendly-mentor",
  language: "en"
};

function isValid(p: Partial<Preferences>): p is Preferences {
  return (
    !!p &&
    LEVELS.some((l) => l.id === p.level) &&
    TEACHING_STYLES.some((s) => s.id === p.style) &&
    CHARACTERS.some((c) => c.id === p.character) &&
    LANGUAGES.some((l) => l.id === p.language)
  );
}

export function loadPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS, style: mostUsedStyle() ?? DEFAULTS.style };
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    if (isValid(parsed)) return parsed;
  } catch {
    // ignore
  }
  return { ...DEFAULTS, style: mostUsedStyle() ?? DEFAULTS.style };
}

export function savePreferences(p: Preferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

export function recordStyleUse(style: TeachingStyleId): void {
  if (typeof window === "undefined") return;
  const counts = readStyleCounts();
  counts[style] = (counts[style] ?? 0) + 1;
  window.localStorage.setItem(STYLE_COUNTS_KEY, JSON.stringify(counts));
}

export function mostUsedStyle(): TeachingStyleId | null {
  if (typeof window === "undefined") return null;
  const counts = readStyleCounts();
  let best: TeachingStyleId | null = null;
  let bestCount = 0;
  for (const style of TEACHING_STYLES) {
    const c = counts[style.id] ?? 0;
    if (c > bestCount) {
      bestCount = c;
      best = style.id;
    }
  }
  return best;
}

function readStyleCounts(): Partial<Record<TeachingStyleId, number>> {
  try {
    const raw = window.localStorage.getItem(STYLE_COUNTS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<TeachingStyleId, number>>) : {};
  } catch {
    return {};
  }
}
