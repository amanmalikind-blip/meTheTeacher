import {
  ALL_INTEREST_IDS,
  ALL_SUBJECT_IDS,
  CBSE_CLASSES,
  CHARACTERS,
  COMFORT_LEVELS,
  DEPTH_LEVELS,
  LANGUAGES,
  TEACHING_STYLES
} from "./constants";
import type { LessonRequest } from "./prompt";

// Validates the persona + chapter body shared by the lesson endpoints.
export function validateLessonBody(
  body: unknown
): LessonRequest | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const b = body as Record<string, unknown>;

  const chapter = typeof b.chapter === "string" ? b.chapter.trim() : "";
  if (!chapter || chapter.length > 200) {
    return { error: "Chapter/topic must be 1–200 characters." };
  }
  if (!CBSE_CLASSES.some((c) => c.id === b.klass)) return { error: "Invalid class." };
  if (typeof b.subject !== "string" || !ALL_SUBJECT_IDS.has(b.subject)) {
    return { error: "Invalid subject." };
  }
  if (
    !Array.isArray(b.interests) ||
    b.interests.length === 0 ||
    b.interests.length > 16 ||
    !b.interests.every((i) => typeof i === "string" && ALL_INTEREST_IDS.has(i))
  ) {
    return { error: "Pick at least one valid interest." };
  }
  if (!COMFORT_LEVELS.some((c) => c.id === b.comfort)) {
    return { error: "Invalid confidence level." };
  }
  if (!TEACHING_STYLES.some((s) => s.id === b.style)) {
    return { error: "Invalid teaching style." };
  }
  if (!CHARACTERS.some((c) => c.id === b.character)) {
    return { error: "Invalid character." };
  }
  if (!LANGUAGES.some((l) => l.id === b.language)) {
    return { error: "Invalid language." };
  }

  const city =
    typeof b.city === "string" ? b.city.trim().slice(0, 60) : undefined;
  const depth = DEPTH_LEVELS.some((d) => d.id === b.depth)
    ? (b.depth as LessonRequest["depth"])
    : "detailed";

  return {
    klass: b.klass as LessonRequest["klass"],
    subject: b.subject,
    interests: b.interests as string[],
    comfort: b.comfort as LessonRequest["comfort"],
    style: b.style as LessonRequest["style"],
    character: b.character as LessonRequest["character"],
    language: b.language as LessonRequest["language"],
    city,
    depth,
    chapter
  };
}

// Pulls a clean list of section titles (from the outline) out of a request body.
export function parseSections(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim().slice(0, 160))
    .slice(0, 12);
}
