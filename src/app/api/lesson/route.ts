import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, LESSON_MODEL } from "@/lib/anthropic";
import { buildUserPrompt, LESSON_SYSTEM_PROMPT, type LessonRequest } from "@/lib/prompt";
import {
  CHARACTERS,
  LANGUAGES,
  LEVELS,
  TEACHING_STYLES
} from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validate(body: unknown): LessonRequest | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const b = body as Record<string, unknown>;
  const topic = typeof b.topic === "string" ? b.topic.trim() : "";
  if (!topic || topic.length > 200) {
    return { error: "Topic must be 1-200 characters." };
  }
  const level = b.level;
  const style = b.style;
  const character = b.character;
  const language = b.language;

  if (!LEVELS.some((l) => l.id === level)) return { error: "Invalid level." };
  if (!TEACHING_STYLES.some((s) => s.id === style)) {
    return { error: "Invalid teaching style." };
  }
  if (!CHARACTERS.some((c) => c.id === character)) {
    return { error: "Invalid character." };
  }
  if (!LANGUAGES.some((l) => l.id === language)) {
    return { error: "Invalid language." };
  }

  return {
    topic,
    level: level as LessonRequest["level"],
    style: style as LessonRequest["style"],
    character: character as LessonRequest["character"],
    language: language as LessonRequest["language"]
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

  let client: Anthropic;
  try {
    client = getAnthropic();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server misconfigured.";
    return Response.json({ error: message }, { status: 500 });
  }

  try {
    const stream = client.messages.stream({
      model: LESSON_MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: LESSON_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [
        { role: "user", content: buildUserPrompt(validated) }
      ]
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          stream.on("text", (delta) => {
            controller.enqueue(encoder.encode(delta));
          });
          await stream.finalMessage();
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        stream.abort();
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "The teaching assistant is busy. Try again in a moment." },
        { status: 429 }
      );
    }
    if (err instanceof Anthropic.APIError) {
      return Response.json(
        { error: `Upstream error: ${err.message}` },
        { status: err.status ?? 500 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
