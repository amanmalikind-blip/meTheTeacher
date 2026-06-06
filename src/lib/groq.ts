// Minimal Groq client using the OpenAI-compatible REST endpoint.
// We use fetch directly (no SDK) so there are zero extra npm dependencies
// and the lockfile never needs to change.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Free, high-quality open model on Groq. Override via env if you like.
export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export class GroqError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GroqError";
    this.status = status;
  }
}

function getKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new GroqError(
      500,
      "GROQ_API_KEY is not set. Copy .env.example to .env.local and add a free key from https://console.groq.com/keys"
    );
  }
  return key;
}

type ChatOptions = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
};

/**
 * Calls Groq with streaming enabled and returns a ReadableStream of plain
 * text deltas (the SSE envelope is stripped server-side), ready to pipe
 * straight to the browser.
 */
export async function streamGroqChat(
  opts: ChatOptions
): Promise<ReadableStream<Uint8Array>> {
  const key = getKey();

  const upstream = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      stream: true,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.7,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user }
      ]
    }),
    signal: opts.signal
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    throw new GroqError(upstream.status, detail || upstream.statusText);
  }

  return streamFromReader(upstream.body.getReader());
}

// Non-streaming completion — returns the full text. `json` enables Groq's
// JSON object mode for structured output.
export async function groqChat(
  opts: ChatOptions & { json?: boolean }
): Promise<string> {
  const key = getKey();
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.7,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user }
      ]
    }),
    signal: opts.signal
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GroqError(res.status, detail || res.statusText);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

function streamFromReader(
  reader: ReadableStreamDefaultReader<Uint8Array>
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by blank lines; each line starts with "data: ".
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "" || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta: string = json?.choices?.[0]?.delta?.content ?? "";
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            // Partial JSON across chunks — push back and wait for more.
            buffer = `${line}\n${buffer}`;
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      reader.cancel().catch(() => undefined);
    }
  });
}
