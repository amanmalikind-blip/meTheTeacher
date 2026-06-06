"use client";

import {
  ALL_INTEREST_IDS,
  ALL_SUBJECT_IDS,
  CBSE_CLASSES,
  CHARACTERS,
  COMFORT_LEVELS,
  LANGUAGES,
  TEACHING_STYLES,
  type CharacterId,
  type ClassId,
  type ComfortId,
  type LanguageId,
  type TeachingStyleId
} from "./constants";

const PERSONA_KEY = "mtt.persona.v2";

export type Persona = {
  klass: ClassId;
  subject: string;
  interests: string[];
  comfort: ComfortId;
  style: TeachingStyleId;
  character: CharacterId;
  language: LanguageId;
  voiceURI?: string;
};

export const DEFAULT_PERSONA: Persona = {
  klass: "10",
  subject: "science",
  interests: [],
  comfort: "some",
  style: "analogies",
  character: "friendly-mentor",
  language: "en"
};

export function isCompletePersona(p: Partial<Persona> | null): p is Persona {
  return (
    !!p &&
    CBSE_CLASSES.some((c) => c.id === p.klass) &&
    typeof p.subject === "string" &&
    ALL_SUBJECT_IDS.has(p.subject) &&
    Array.isArray(p.interests) &&
    p.interests.length > 0 &&
    p.interests.every((i) => ALL_INTEREST_IDS.has(i)) &&
    COMFORT_LEVELS.some((c) => c.id === p.comfort) &&
    TEACHING_STYLES.some((s) => s.id === p.style) &&
    CHARACTERS.some((c) => c.id === p.character) &&
    LANGUAGES.some((l) => l.id === p.language)
  );
}

export function loadPersona(): Persona | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PERSONA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Persona>;
    return isCompletePersona(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePersona(p: Persona): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERSONA_KEY, JSON.stringify(p));
}

export function clearPersona(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PERSONA_KEY);
}
