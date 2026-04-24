export const TEACHING_STYLES = [
  {
    id: "analogies",
    label: "Analogies & metaphors",
    hint: "Explain via everyday comparisons"
  },
  {
    id: "socratic",
    label: "Socratic questions",
    hint: "Lead with guided questions"
  },
  {
    id: "examples",
    label: "Worked examples",
    hint: "Show complete, step-by-step examples"
  },
  {
    id: "story",
    label: "Story-driven",
    hint: "Teach through a narrative"
  },
  {
    id: "visual",
    label: "Visual / diagrammatic",
    hint: "Describe diagrams and visual models"
  },
  {
    id: "practical",
    label: "Practical / project-based",
    hint: "Build something hands-on"
  }
] as const;

export type TeachingStyleId = (typeof TEACHING_STYLES)[number]["id"];

export const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" }
] as const;

export type LevelId = (typeof LEVELS)[number]["id"];

export const LANGUAGES = [
  { id: "en", label: "English", bcp47: "en-US" },
  { id: "es", label: "Spanish", bcp47: "es-ES" },
  { id: "fr", label: "French", bcp47: "fr-FR" },
  { id: "de", label: "German", bcp47: "de-DE" },
  { id: "hi", label: "Hindi", bcp47: "hi-IN" },
  { id: "zh", label: "Mandarin Chinese", bcp47: "zh-CN" },
  { id: "ja", label: "Japanese", bcp47: "ja-JP" },
  { id: "ar", label: "Arabic", bcp47: "ar-SA" },
  { id: "pt", label: "Portuguese", bcp47: "pt-BR" }
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];

export const CHARACTERS = [
  {
    id: "friendly-mentor",
    label: "Friendly Mentor",
    persona: "warm, encouraging, patient; uses 'we' and celebrates progress"
  },
  {
    id: "quirky-scientist",
    label: "Quirky Scientist",
    persona: "curious, playful, full of 'aha!' moments and fun facts"
  },
  {
    id: "strict-professor",
    label: "Strict Professor",
    persona: "formal, rigorous, expects precision; pushes for depth"
  },
  {
    id: "wise-elder",
    label: "Wise Elder",
    persona: "calm, story-telling, frames ideas with ancient wisdom"
  },
  {
    id: "hype-coach",
    label: "Hype Coach",
    persona: "high-energy, motivational, turns learning into a challenge"
  }
] as const;

export type CharacterId = (typeof CHARACTERS)[number]["id"];

export const FREE_LESSON_LIMIT = Number(
  process.env.NEXT_PUBLIC_FREE_LESSON_LIMIT || 5
);
