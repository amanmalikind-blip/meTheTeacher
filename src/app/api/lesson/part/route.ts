import { NextRequest } from "next/server";
import { GroqError, streamGroqChat } from "@/lib/groq";
import {
  INTRO_SYSTEM_PROMPT,
  SECTION_SYSTEM_PROMPT,
  WRAP_SYSTEM_PROMPT,
  buildIntroPrompt,
  buildSectionPrompt,
  buildWrapPrompt
} from "@/lib/prompt";
import { parseSections, validateLessonBody } from "@/lib/lessonValidate";
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

  // Full-chapter mode makes many calls in a row, so allow a higher burst.
  const limit = rateLimit(clientIp(req), 60);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const v = validateLessonBody(body);
  if ("error" in v) return Response.json({ error: v.error }, { status: 400 });

  const mode = body.mode;
  const sections = parseSections(body.sections);
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";

  let system: string;
  let userPrompt: string;
  let maxTokens: number;
  if (mode === "intro") {
    system = INTRO_SYSTEM_PROMPT;
    userPrompt = buildIntroPrompt(v, sections);
    maxTokens = 1300;
  } else if (mode === "wrap") {
    system = WRAP_SYSTEM_PROMPT;
    userPrompt = buildWrapPrompt(v, sections);
    maxTokens = 3500;
  } else if (mode === "section") {
    if (!title) return Response.json({ error: "Missing section title." }, { status: 400 });
    system = SECTION_SYSTEM_PROMPT;
    userPrompt = buildSectionPrompt(v, title, sections.length ? sections : [title]);
    maxTokens = 2800;
  } else {
    return Response.json({ error: "Invalid part mode." }, { status: 400 });
  }

  try {
    const stream = await streamGroqChat({
      system,
      user: userPrompt,
      maxTokens,
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
      return Response.json(
        { error: err.message },
        {
          status: err.status || 500,
          headers:
            err.status === 429 ? { "Retry-After": "8" } : undefined
        }
      );
    }
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
