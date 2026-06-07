import { NextRequest } from "next/server";
import { GroqError, groqChat } from "@/lib/groq";
import { buildQuizPrompt, QUIZ_SYSTEM_PROMPT } from "@/lib/prompt";
import { ALL_SUBJECT_IDS, CBSE_CLASSES, LANGUAGES } from "@/lib/constants";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

function sanitizeQuestions(raw: unknown): QuizQuestion[] {
  const arr = Array.isArray((raw as { questions?: unknown })?.questions)
    ? (raw as { questions: unknown[] }).questions
    : [];
  const out: QuizQuestion[] = [];
  for (const q of arr) {
    const o = q as Record<string, unknown>;
    const question = typeof o.question === "string" ? o.question : "";
    const options = Array.isArray(o.options)
      ? o.options.filter((x): x is string => typeof x === "string")
      : [];
    const correctIndex = Number(o.correctIndex);
    const explanation = typeof o.explanation === "string" ? o.explanation : "";
    if (question && options.length === 4 && correctIndex >= 0 && correctIndex < 4) {
      out.push({ question, options, correctIndex, explanation });
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  const limit = rateLimit(clientIp(req), 8);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many quizzes too fast. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const chapter = typeof b.chapter === "string" ? b.chapter.trim() : "";
  const count = Math.min(10, Math.max(3, Number(b.count) || 5));
  if (!chapter) return Response.json({ error: "Missing chapter." }, { status: 400 });
  if (!CBSE_CLASSES.some((c) => c.id === b.klass) || !ALL_SUBJECT_IDS.has(String(b.subject))) {
    return Response.json({ error: "Invalid class or subject." }, { status: 400 });
  }
  if (!LANGUAGES.some((l) => l.id === b.language)) {
    return Response.json({ error: "Invalid language." }, { status: 400 });
  }

  try {
    const text = await groqChat({
      system: QUIZ_SYSTEM_PROMPT,
      user: buildQuizPrompt({
        klass: b.klass as never,
        subject: String(b.subject),
        interests: [],
        comfort: "some" as never,
        language: b.language as never,
        chapter,
        count
      }),
      json: true,
      maxTokens: 3000,
      temperature: 0.6,
      signal: req.signal
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "Could not generate a valid quiz. Please try again." },
        { status: 502 }
      );
    }
    const questions = sanitizeQuestions(parsed);
    if (questions.length === 0) {
      return Response.json(
        { error: "No questions came back. Please try again." },
        { status: 502 }
      );
    }
    return Response.json({ questions });
  } catch (err) {
    if (err instanceof GroqError) {
      return Response.json({ error: err.message }, { status: err.status || 500 });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
