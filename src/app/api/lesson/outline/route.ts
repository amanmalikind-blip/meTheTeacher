import { NextRequest } from "next/server";
import { GroqError, groqChat } from "@/lib/groq";
import { OUTLINE_SYSTEM_PROMPT, buildOutlinePrompt } from "@/lib/prompt";
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

  const limit = rateLimit(clientIp(req), 30);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const v = validateLessonBody(body);
  if ("error" in v) return Response.json({ error: v.error }, { status: 400 });

  try {
    const text = await groqChat({
      system: OUTLINE_SYSTEM_PROMPT,
      user: buildOutlinePrompt(v),
      json: true,
      maxTokens: 800,
      temperature: 0.3,
      signal: req.signal
    });
    let sections: string[] = [];
    try {
      sections = parseSections((JSON.parse(text) as { sections?: unknown }).sections);
    } catch {
      sections = [];
    }
    if (sections.length === 0) {
      return Response.json(
        { error: "Could not outline this chapter. Please try again." },
        { status: 502 }
      );
    }
    return Response.json({ sections });
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
