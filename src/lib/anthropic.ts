import Anthropic from "@anthropic-ai/sdk";

let singleton: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!singleton) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and fill in your key."
      );
    }
    singleton = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return singleton;
}

export const LESSON_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
