import { NextRequest } from "next/server";
import { GroqError, streamGroqChat } from "@/lib/groq";
import { buildUserPrompt, LESSON_SYSTEM_PROMPT, type LessonRequest } from "@/lib/prompt";
import {
  ALL_INTEREST_IDS,
  ALL_SUBJECT_IDS,
  CBSE_CLASSES,
  CHARACTERS,
  COMFORT_LEVELS,
  LANGUAGES,
  TEACHING_STYLES
} from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validate(body: unknown): LessonRequest | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const b = body as Record<string, unknown>;

  const chapter = typeof b.chapter === "string" ? b.chapter.trim() : "";
  if (!chapter || chapter.length > 200) {
    return { error: "Chapter/topic must be 1–200 characters." };
  }

  if (!CBSE_CLASSES.some((c) => c.id === b.klass)) {
    return { error: "Invalid class." };
  }
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

  return {
    klass: b.klass as LessonRequest["klass"],
    subject: b.subject,
    interests: b.interests as string[],
    comfort: b.comfort as LessonRequest["comfort"],
    style: b.style as LessonRequest["style"],
    character: b.character as LessonRequest["character"],
    language: b.language as LessonRequest["language"],
    chapter
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const validated = validate(body);
  if ("error" in validated) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  try {
    const stream = await streamGroqChat({
      system: LESSON_SYSTEM_PROMPT,
      user: buildUserPrompt(validated),
      maxTokens: 4096,
      temperature: 0.7,
      signal: req.signal
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (err) {
    if (err instanceof GroqError) {
      if (err.status === 429) {
        return Response.json(
          { error: "The free AI tier is busy right now. Please try again in a moment." },
          { status: 429 }
        );
      }
      return Response.json({ error: err.message }, { status: err.status || 500 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
