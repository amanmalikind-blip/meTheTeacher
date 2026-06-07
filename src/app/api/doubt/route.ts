import { NextRequest } from "next/server";
import { GroqError, streamGroqChat } from "@/lib/groq";
import { buildDoubtPrompt, DOUBT_SYSTEM_PROMPT } from "@/lib/prompt";
import {
  ALL_INTEREST_IDS,
  ALL_SUBJECT_IDS,
  CBSE_CLASSES,
  LANGUAGES
} from "@/lib/constants";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  const limit = rateLimit(clientIp(req), 20);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many questions too fast. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const question = typeof b.question === "string" ? b.question.trim() : "";
  const chapter = typeof b.chapter === "string" ? b.chapter.trim() : "";
  if (!question || question.length > 300) {
    return Response.json({ error: "Question must be 1–300 characters." }, { status: 400 });
  }
  if (!chapter) return Response.json({ error: "Missing chapter." }, { status: 400 });
  if (!CBSE_CLASSES.some((c) => c.id === b.klass) || !ALL_SUBJECT_IDS.has(String(b.subject))) {
    return Response.json({ error: "Invalid persona." }, { status: 400 });
  }
  if (!LANGUAGES.some((l) => l.id === b.language)) {
    return Response.json({ error: "Invalid language." }, { status: 400 });
  }
  const interests = Array.isArray(b.interests)
    ? (b.interests as unknown[]).filter((i): i is string => typeof i === "string" && ALL_INTEREST_IDS.has(i))
    : [];

  try {
    const stream = await streamGroqChat({
      system: DOUBT_SYSTEM_PROMPT,
      user: buildDoubtPrompt({
        klass: b.klass as never,
        subject: String(b.subject),
        interests,
        comfort: "some" as never,
        style: "analogies" as never,
        character: "friendly-mentor" as never,
        language: b.language as never,
        city: typeof b.city === "string" ? b.city.trim().slice(0, 60) : undefined,
        chapter,
        question
      }),
      maxTokens: 700,
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
      return Response.json({ error: err.message }, { status: err.status || 500 });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
