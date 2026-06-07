// CBSE classes supported
export const CBSE_CLASSES = [
  { id: "10", label: "Class 10" },
  { id: "12", label: "Class 12" }
] as const;

export type ClassId = (typeof CBSE_CLASSES)[number]["id"];

// Subjects per class (CBSE). Kept practical rather than exhaustive.
export const SUBJECTS: Record<ClassId, { id: string; label: string }[]> = {
  "10": [
    { id: "science", label: "Science" },
    { id: "mathematics", label: "Mathematics" },
    { id: "social-science", label: "Social Science" },
    { id: "english", label: "English" },
    { id: "hindi", label: "Hindi" },
    { id: "information-technology", label: "Information Technology" }
  ],
  "12": [
    { id: "physics", label: "Physics" },
    { id: "chemistry", label: "Chemistry" },
    { id: "mathematics", label: "Mathematics" },
    { id: "biology", label: "Biology" },
    { id: "computer-science", label: "Computer Science" },
    { id: "english", label: "English" },
    { id: "accountancy", label: "Accountancy" },
    { id: "business-studies", label: "Business Studies" },
    { id: "economics", label: "Economics" },
    { id: "history", label: "History" },
    { id: "political-science", label: "Political Science" },
    { id: "geography", label: "Geography" }
  ]
};

// Flat set of every valid subject id, for server-side validation.
export const ALL_SUBJECT_IDS = new Set(
  Object.values(SUBJECTS).flatMap((list) => list.map((s) => s.id))
);

export function subjectsForClass(klass: ClassId) {
  return SUBJECTS[klass] ?? [];
}

export function subjectLabel(id: string): string {
  for (const list of Object.values(SUBJECTS)) {
    const found = list.find((s) => s.id === id);
    if (found) return found.label;
  }
  return id;
}

// Interests / hobbies — used by the AI to build analogies the student relates to.
export const INTERESTS = [
  { id: "cricket", label: "🏏 Cricket" },
  { id: "football", label: "⚽ Football" },
  { id: "movies", label: "🎬 Movies & TV" },
  { id: "video-games", label: "🎮 Video games" },
  { id: "music", label: "🎵 Music" },
  { id: "social-media", label: "📱 Social media" },
  { id: "cooking", label: "🍳 Cooking & food" },
  { id: "space", label: "🚀 Space & astronomy" },
  { id: "animals", label: "🐾 Animals & nature" },
  { id: "cars-bikes", label: "🏍️ Cars & bikes" },
  { id: "anime-comics", label: "🦸 Anime & comics" },
  { id: "dance", label: "💃 Dance" },
  { id: "travel", label: "✈️ Travel" },
  { id: "fashion", label: "👗 Fashion" },
  { id: "fitness", label: "🏋️ Fitness & gym" },
  { id: "coding-tech", label: "💻 Coding & gadgets" }
] as const;

export type InterestId = (typeof INTERESTS)[number]["id"];

export const ALL_INTEREST_IDS: Set<string> = new Set(INTERESTS.map((i) => i.id));

export function interestLabel(id: string): string {
  return INTERESTS.find((i) => i.id === id)?.label ?? id;
}

// How the student likes to be taught.
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
    label: "Practical / real-life",
    hint: "Connect to everyday life and exams"
  }
] as const;

export type TeachingStyleId = (typeof TEACHING_STYLES)[number]["id"];

// How confident the student already feels with the subject.
export const COMFORT_LEVELS = [
  { id: "new", label: "Totally new to it" },
  { id: "some", label: "Know a little" },
  { id: "confident", label: "Fairly confident" }
] as const;

export type ComfortId = (typeof COMFORT_LEVELS)[number]["id"];

export const LANGUAGES = [
  { id: "en", label: "English", bcp47: "en-IN" },
  { id: "hi", label: "Hindi", bcp47: "hi-IN" },
  { id: "hinglish", label: "Hinglish (Hindi + English mix)", bcp47: "en-IN" }
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];

export const CHARACTERS = [
  {
    id: "friendly-mentor",
    label: "Friendly Mentor",
    persona: "warm, encouraging, patient; uses 'we' and celebrates progress"
  },
  {
    id: "cool-senior",
    label: "Cool Senior (Bhaiya/Didi)",
    persona: "relatable older student; casual, uses examples from daily teen life"
  },
  {
    id: "quirky-scientist",
    label: "Quirky Scientist",
    persona: "curious, playful, full of 'aha!' moments and fun facts"
  },
  {
    id: "strict-professor",
    label: "Strict Professor",
    persona: "formal, rigorous, exam-focused; pushes for precision and depth"
  },
  {
    id: "hype-coach",
    label: "Hype Coach",
    persona: "high-energy, motivational, turns learning into a challenge"
  }
] as const;

export type CharacterId = (typeof CHARACTERS)[number]["id"];

// Popular Indian cities offered as autocomplete suggestions for the persona's
// city. It's a free-text field — any city works; these just speed up entry.
export const POPULAR_CITIES = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Kolkata",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Bhopal",
  "Patna",
  "Chandigarh",
  "Surat",
  "Kochi",
  "Coimbatore",
  "Visakhapatnam",
  "Guwahati",
  "Amritsar",
  "Varanasi",
  "Ludhiana"
] as const;

export const FREE_LESSON_LIMIT = Number(
  process.env.NEXT_PUBLIC_FREE_LESSON_LIMIT || 5
);
