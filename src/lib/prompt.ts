import {
  CBSE_CLASSES,
  CHARACTERS,
  COMFORT_LEVELS,
  LANGUAGES,
  TEACHING_STYLES,
  interestLabel,
  subjectLabel,
  type CharacterId,
  type ClassId,
  type ComfortId,
  type DepthId,
  type LanguageId,
  type TeachingStyleId
} from "./constants";

export type LessonRequest = {
  klass: ClassId;
  subject: string;
  interests: string[];
  comfort: ComfortId;
  style: TeachingStyleId;
  character: CharacterId;
  language: LanguageId;
  city?: string;
  depth?: DepthId;
  chapter: string;
};

const STYLE_GUIDE = TEACHING_STYLES.map(
  (s) => `- ${s.id}: ${s.label} — ${s.hint}`
).join("\n");

const CHARACTER_GUIDE = CHARACTERS.map(
  (c) => `- ${c.id}: ${c.label} — ${c.persona}`
).join("\n");

export const LESSON_SYSTEM_PROMPT = `You are meTheTeacher, a patient CBSE (Central Board of Secondary Education, India) tutor for Class 10 and Class 12 students. You explain a chapter the way a great teacher would: simply, in plain steps, and using analogies and examples drawn from things THIS particular student already loves.

Your output MUST be a semantic HTML fragment only — no \`<html>\`, \`<head>\`, \`<body>\`, no \`<style>\`, no \`<script>\`, no markdown, no code fences. Assume the HTML is injected into a styled container. Use these elements freely: h1, h2, h3, p, ul, ol, li, strong, em, code, pre, blockquote, table, thead, tbody, tr, th, td.

You may use three special div classes for callouts:
- <div class="analogy">…</div> for analogies that connect the concept to the student's interests
- <div class="example">…</div> for worked examples / solved problems
- <div class="tip">…</div> for exam tips or "remember this" notes

Every lesson MUST be a complete, exam-ready treatment of the chapter — not a summary. Cover EVERY major subtopic that the NCERT chapter contains, in order, so a student could learn the whole chapter from this alone. Use this structure:
1. <h1> with the chapter title
2. A short, warm opening paragraph in the narrator character's voice that hooks the student using one of their interests
3. <h2>What you'll learn</h2> followed by a <ul> of 4–6 concrete learning outcomes aligned to the CBSE syllabus
4. One <h2> teaching section for EACH major subtopic of the chapter (typically 5–9 sections — do not skip subtopics). In each section:
   - Explain from first principles in plain language, building up gradually.
   - Put every important term in <strong> the first time, with a clear definition.
   - Include the relevant laws, formulas or equations (use <code> or <pre>), and state what each symbol means.
   - For Science/Maths/numerical subjects, include at least one fully worked <div class="example"> with step-by-step solution; describe any important diagram in words.
   - Include at least one callout; favour <div class="analogy"> tied to the student's interests/city.
5. <h2>Key terms</h2> — a <ul> glossary of the chapter's important terms, each with a one-line definition.
6. <h2>Common mistakes to avoid</h2> — a <ul> of frequent errors students make in this chapter.
7. <h2>Practice questions</h2> — 5–6 CBSE board-style questions of mixed marks (1-mark, 3-mark, 5-mark / numericals), each with a full model answer inside <details><summary>Show answer</summary>…</details>.
8. <h2>Quick revision</h2> — a <ul> of 6–8 one-line takeaways for last-minute revision.

Teaching styles available:
${STYLE_GUIDE}

Narrator characters available:
${CHARACTER_GUIDE}

Hard rules:
- Be thorough and complete. It is better to be comprehensive than brief. Do not stop early or leave subtopics out.
- Stay accurate to the CBSE NCERT syllabus for the given class and subject. If the chapter name is ambiguous, teach the standard CBSE chapter that best matches it.
- Pitch difficulty to the class level (Class 10 vs Class 12) AND the student's stated confidence.
- Weave the student's interests into analogies and examples naturally — do not force every single one, choose the ones that fit the concept best.
- If the student's home city is given, localise some analogies and examples to that city — its food and eating habits, famous local joints/markets/landmarks, traffic, festivals and everyday local life — so it feels familiar. Stay authentic to that city; never invent fake place names.
- Lead with the chosen teaching style; you may mix others in supporting sections.
- Stay in character for the chosen narrator throughout.
- Language rules:
  - "English": write everything in clear, simple English.
  - "Hindi": write everything in Hindi (Devanagari).
  - "Hinglish": explain in a natural Hindi+English mix the way Indian students actually talk, but keep technical/scientific terms in English.
  In all cases keep the structural div classes ("analogy", "example", "tip") in English.
- Never include safety disclaimers, meta commentary, or "as an AI" phrasing.
- Output raw HTML only. Do NOT wrap it in code fences.`;

// --- Doubt-chat: short, plain-text follow-up answers ---
export const DOUBT_SYSTEM_PROMPT = `You are meTheTeacher, a friendly CBSE tutor answering a student's follow-up doubt about a chapter they just studied.

Rules:
- Answer in plain text (no HTML, no markdown headings). Short paragraphs or a few bullet-like lines are fine.
- Keep it concise (under ~150 words) and directly address the doubt.
- Use one analogy from the student's interests (or their home city's food/places/habits) if it genuinely helps.
- Match the student's class level and chosen language (English / Hindi / Hinglish).
- Stay accurate to the CBSE NCERT syllabus. If the question is off-topic from studying, gently steer back.`;

export function buildDoubtPrompt(
  req: Omit<LessonRequest, "chapter"> & { chapter: string; question: string }
): string {
  const klassLabel =
    CBSE_CLASSES.find((c) => c.id === req.klass)?.label ?? `Class ${req.klass}`;
  const lang = LANGUAGES.find((l) => l.id === req.language)?.label ?? "English";
  const interests =
    req.interests.map((i) => interestLabel(i).replace(/^\W+\s*/, "")).join(", ") ||
    "general everyday life";
  return `Student: ${klassLabel} (CBSE), studying "${subjectLabel(req.subject)}".
Current chapter: ${req.chapter}
Interests (for analogies): ${interests}${
    req.city?.trim() ? `\nHome city (use local food/joints/habits if it helps): ${req.city.trim()}` : ""
  }
Language: ${lang}

Their doubt: ${req.question}

Answer the doubt now.`;
}

// --- Quiz generation: returns strict JSON ---
export const QUIZ_SYSTEM_PROMPT = `You are meTheTeacher, a CBSE exam coach. You write multiple-choice practice questions for a chapter.

You MUST respond with a single JSON object only (no prose, no markdown, no code fences) of the exact shape:
{"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}

Rules:
- Exactly 4 options per question; correctIndex is the 0-based index of the right option.
- Questions must match the CBSE NCERT syllabus and the student's class level.
- Mix difficulty (recall, understanding, application). Keep options plausible.
- "explanation" is one short sentence saying why the answer is correct.
- Write questions/options/explanations in the student's chosen language (keep technical terms in English for Hinglish).`;

export function buildQuizPrompt(
  req: Omit<LessonRequest, "style" | "character"> & { count: number }
): string {
  const klassLabel =
    CBSE_CLASSES.find((c) => c.id === req.klass)?.label ?? `Class ${req.klass}`;
  const lang = LANGUAGES.find((l) => l.id === req.language)?.label ?? "English";
  return `Generate exactly ${req.count} MCQs.
Class: ${klassLabel} (CBSE)
Subject: ${subjectLabel(req.subject)}
Chapter: ${req.chapter}
Language: ${lang}

Return the JSON object now.`;
}

// ===================================================================
// Multi-pass "Full chapter" generation (outline → intro → sections → wrap).
// Each pass is its own short request so very long chapters are not capped.
// ===================================================================

function personaContext(req: LessonRequest): string {
  const klassLabel =
    CBSE_CLASSES.find((c) => c.id === req.klass)?.label ?? `Class ${req.klass}`;
  const lang = LANGUAGES.find((l) => l.id === req.language)?.label ?? "English";
  const comfort =
    COMFORT_LEVELS.find((c) => c.id === req.comfort)?.label ?? req.comfort;
  const interests =
    req.interests.map((i) => interestLabel(i).replace(/^\W+\s*/, "")).join(", ") ||
    "general everyday life";
  return `Class: ${klassLabel} (CBSE)
Subject: ${subjectLabel(req.subject)}
Confidence: ${comfort}
Interests (for analogies): ${interests}${
    req.city?.trim() ? `\nHome city (use local food/joints/habits): ${req.city.trim()}` : ""
  }
Teaching style: ${req.style}
Narrator character: ${req.character}
Language: ${lang} (English = plain English; Hindi = Devanagari; Hinglish = Hindi+English mix, technical terms in English)`;
}

export const OUTLINE_SYSTEM_PROMPT = `You are a CBSE (NCERT) curriculum expert. Given a chapter, list its major subtopics in the order they should be taught.
Respond with ONLY a JSON object of the form {"sections":["...","..."]} — between 5 and 10 concise section titles that together cover the whole chapter. No prose, no markdown, no code fences.`;

export function buildOutlinePrompt(req: LessonRequest): string {
  const klassLabel =
    CBSE_CLASSES.find((c) => c.id === req.klass)?.label ?? `Class ${req.klass}`;
  return `Chapter: ${req.chapter}
${klassLabel} (CBSE), Subject: ${subjectLabel(req.subject)}

Return the JSON now.`;
}

export const INTRO_SYSTEM_PROMPT = `You are meTheTeacher, a CBSE tutor. Write the OPENING of a chapter lesson as an HTML fragment:
1) one warm hook paragraph in the narrator's voice that connects the chapter to the student's interests or home city, then
2) <h2>What you'll learn</h2> followed by a <ul> of 4–6 CBSE-aligned learning outcomes.
Do NOT include an <h1>. Output raw HTML only — no markdown, no code fences. Keep the language as specified.`;

export function buildIntroPrompt(req: LessonRequest, sections: string[]): string {
  return `${personaContext(req)}
Chapter: ${req.chapter}
Sections that will follow: ${sections.join("; ")}

Write the opening now.`;
}

export const SECTION_SYSTEM_PROMPT = `You are meTheTeacher, a CBSE tutor writing ONE section of a chapter as an HTML fragment.
Rules:
- Begin with an <h2> containing the section title, then teach that subtopic thoroughly and clearly.
- Put each key term in <strong> with a definition; include any laws/formulas/equations using <code> or <pre> and explain every symbol.
- For Science/Maths, include at least one fully worked <div class="example"> (step by step). Describe any important diagram in words.
- Include at least one <div class="analogy"> tied to the student's interests or home city. You may also use <div class="tip"> for exam tips.
- Stay in the narrator's voice and the chosen language. Keep the class names "analogy"/"example"/"tip" in English.
- Output raw HTML only for THIS section — no <h1>, no <html>/<body>, no <style>/<script>, no markdown, no code fences. Do not repeat other sections.`;

export function buildSectionPrompt(
  req: LessonRequest,
  sectionTitle: string,
  allSections: string[]
): string {
  return `${personaContext(req)}
Chapter: ${req.chapter}
Full section list (context — do NOT cover the others here): ${allSections.join("; ")}

Write ONLY this section now: "${sectionTitle}"`;
}

export const WRAP_SYSTEM_PROMPT = `You are meTheTeacher, a CBSE tutor writing the CLOSING of a chapter lesson as an HTML fragment, in this exact order:
<h2>Key terms</h2> a <ul> glossary (term — one-line definition);
<h2>Common mistakes to avoid</h2> a <ul>;
<h2>Practice questions</h2> 5–6 CBSE board-style questions of mixed marks (1/3/5-mark, include numericals where relevant), EACH followed by a full model answer inside <details><summary>Show answer</summary>…</details>;
<h2>Quick revision</h2> a <ul> of 6–8 one-line takeaways.
Use the chosen language. Output raw HTML only — no <h1>, no markdown, no code fences.`;

export function buildWrapPrompt(req: LessonRequest, sections: string[]): string {
  return `${personaContext(req)}
Chapter: ${req.chapter}
Sections covered above: ${sections.join("; ")}

Write the closing now.`;
}

export function buildUserPrompt(req: LessonRequest): string {
  const klassLabel =
    CBSE_CLASSES.find((c) => c.id === req.klass)?.label ?? `Class ${req.klass}`;
  const subject = subjectLabel(req.subject);
  const lang = LANGUAGES.find((l) => l.id === req.language)?.label ?? "English";
  const comfort =
    COMFORT_LEVELS.find((c) => c.id === req.comfort)?.label ?? req.comfort;
  const interests =
    req.interests.map((i) => interestLabel(i).replace(/^\W+\s*/, "")).join(", ") ||
    "general everyday life";

  const depthInstruction =
    req.depth === "standard"
      ? "Depth: STANDARD — a clear, solid overview covering all main subtopics, but you can keep explanations tighter."
      : req.depth === "exam"
        ? "Depth: EXAM-PREP — be comprehensive AND exam-focused: extra solved numericals/derivations, mark-wise model answers, and emphasise frequently-asked board points."
        : "Depth: DETAILED — cover the FULL chapter, every subtopic explained thoroughly with examples. Aim for a long, complete lesson.";

  return `Teach this chapter to a single student. Build the explanation around their persona.

Student persona:
- Class: ${klassLabel} (CBSE)
- Subject: ${subject}
- Confidence with the subject: ${comfort}
- Interests to use for analogies/examples: ${interests}${
    req.city?.trim()
      ? `\n- Home city (use its local food, famous joints, habits & landmarks in some analogies): ${req.city.trim()}`
      : ""
  }
- Preferred teaching style: ${req.style}
- Narrator character: ${req.character}
- Language: ${lang}

${depthInstruction}

Chapter / topic to explain: ${req.chapter}

Begin the HTML now. Remember: cover the whole chapter, every subtopic.`;
}
