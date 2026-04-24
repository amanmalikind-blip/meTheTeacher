"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHARACTERS,
  FREE_LESSON_LIMIT,
  LANGUAGES,
  LEVELS,
  TEACHING_STYLES
} from "@/lib/constants";
import {
  loadPreferences,
  mostUsedStyle,
  recordStyleUse,
  savePreferences,
  type Preferences
} from "@/lib/preferences";
import {
  getLessonCount,
  incrementLessonCount,
  lessonsRemaining,
  quotaExceeded
} from "@/lib/quota";
import {
  htmlToPlainText,
  listVoices,
  onVoicesChanged,
  speak,
  stopSpeaking
} from "@/lib/tts";

type Phase = "idle" | "streaming" | "done" | "error";

export default function LessonPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [topic, setTopic] = useState("");
  const [html, setHtml] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(FREE_LESSON_LIMIT);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [suggestedStyle, setSuggestedStyle] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setPrefs(loadPreferences());
    setRemaining(lessonsRemaining());
    setVoices(listVoices());
    setSuggestedStyle(mostUsedStyle());
    const off = onVoicesChanged(() => setVoices(listVoices()));
    return () => {
      off();
      abortRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  const filteredVoices = useMemo(() => {
    if (!prefs) return voices;
    const lang = LANGUAGES.find((l) => l.id === prefs.language);
    if (!lang) return voices;
    const base = lang.bcp47.split("-")[0];
    const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
    return matching.length > 0 ? matching : voices;
  }, [voices, prefs]);

  if (!prefs) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">Loading…</main>
    );
  }

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const next = { ...prefs, [key]: value } as Preferences;
    setPrefs(next);
    savePreferences(next);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!topic.trim()) {
      setErrorMsg("Please enter a topic.");
      return;
    }
    if (quotaExceeded()) {
      setErrorMsg(
        `You've used your ${FREE_LESSON_LIMIT} free lessons. Thanks for learning with us!`
      );
      return;
    }

    stopSpeaking();
    setIsSpeaking(false);
    setHtml("");
    setPhase("streaming");

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          level: prefs.level,
          style: prefs.style,
          character: prefs.character,
          language: prefs.language
        }),
        signal: controller.signal
      });

      if (!res.ok || !res.body) {
        let msg = `Request failed (${res.status}).`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) msg = data.error;
        } catch {
          // ignore
        }
        setErrorMsg(msg);
        setPhase("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setHtml(acc);
      }

      recordStyleUse(prefs.style);
      incrementLessonCount();
      setRemaining(Math.max(0, FREE_LESSON_LIMIT - getLessonCount()));
      setSuggestedStyle(mostUsedStyle());
      setPhase("done");
    } catch (err) {
      if (controller.signal.aborted) return;
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setPhase("error");
    }
  };

  const toggleSpeak = () => {
    if (!html) return;
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    const lang = LANGUAGES.find((l) => l.id === prefs.language)?.bcp47 ?? "en-US";
    const utter = speak(htmlToPlainText(html), {
      voiceURI: prefs.voiceURI,
      lang,
      rate: 1
    });
    if (!utter) {
      setErrorMsg("Your browser does not support speech synthesis.");
      return;
    }
    setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
  };

  const onExportPdf = () => {
    if (typeof window !== "undefined") window.print();
  };

  const quotaBanner = quotaExceeded() ? (
    <div className="no-print rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3">
      You&apos;ve used all {FREE_LESSON_LIMIT} free lessons. Thanks for trying
      meTheTeacher!
    </div>
  ) : (
    <div className="no-print text-sm text-slate-600">
      {remaining} of {FREE_LESSON_LIMIT} free lessons remaining.
    </div>
  );

  const suggestedLabel =
    suggestedStyle && suggestedStyle !== prefs.style
      ? TEACHING_STYLES.find((s) => s.id === suggestedStyle)?.label
      : null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <nav className="no-print flex items-center justify-between mb-6">
        <Link href="/" className="text-brand-600 font-semibold hover:underline">
          ← meTheTeacher
        </Link>
        {quotaBanner}
      </nav>

      <div className="grid lg:grid-cols-[360px_1fr] gap-8">
        <form
          onSubmit={onSubmit}
          className="no-print bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit sticky top-4"
        >
          <h2 className="font-semibold text-lg mb-4">Design your lesson</h2>

          <label className="block text-sm font-medium text-slate-700 mb-1">
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. How does photosynthesis work?"
            maxLength={200}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Level
            </label>
            <select
              value={prefs.level}
              onChange={(e) =>
                update("level", e.target.value as Preferences["level"])
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Teaching style
              </label>
              {suggestedLabel && (
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "style",
                      suggestedStyle as Preferences["style"]
                    )
                  }
                  className="text-xs text-brand-600 hover:underline"
                >
                  Use your favourite: {suggestedLabel}
                </button>
              )}
            </div>
            <select
              value={prefs.style}
              onChange={(e) =>
                update("style", e.target.value as Preferences["style"])
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {TEACHING_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {TEACHING_STYLES.find((s) => s.id === prefs.style)?.hint}
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Narrator character
            </label>
            <select
              value={prefs.character}
              onChange={(e) =>
                update("character", e.target.value as Preferences["character"])
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {CHARACTERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {CHARACTERS.find((c) => c.id === prefs.character)?.persona}
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Language
            </label>
            <select
              value={prefs.language}
              onChange={(e) =>
                update("language", e.target.value as Preferences["language"])
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Voice
            </label>
            <select
              value={prefs.voiceURI ?? ""}
              onChange={(e) => update("voiceURI", e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              disabled={filteredVoices.length === 0}
            >
              <option value="">System default</option>
              {filteredVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            {filteredVoices.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Your browser reports no voices yet. Pick a language and try
                again, or use your OS system voice.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={phase === "streaming" || quotaExceeded()}
            className="mt-6 w-full rounded-lg bg-brand-600 text-white font-semibold py-2.5 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            {phase === "streaming" ? "Generating…" : "Generate lesson"}
          </button>

          {errorMsg && (
            <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
          )}
        </form>

        <section>
          {phase === "idle" && !html && (
            <div className="rounded-xl bg-white border border-dashed border-slate-300 p-10 text-center text-slate-500">
              Your lesson will appear here. Pick a topic and click{" "}
              <span className="font-semibold">Generate lesson</span>.
            </div>
          )}

          {(phase === "streaming" || html) && (
            <article className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="no-print flex flex-wrap items-center gap-2 justify-end border-b border-slate-200 px-4 py-3">
                <button
                  type="button"
                  onClick={toggleSpeak}
                  disabled={!html}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  {isSpeaking ? "⏹ Stop reading" : "🔊 Read aloud"}
                </button>
                <button
                  type="button"
                  onClick={onExportPdf}
                  disabled={!html || phase === "streaming"}
                  className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  Export to PDF
                </button>
              </div>
              <div
                className="lesson-html px-6 py-6"
                dangerouslySetInnerHTML={{ __html: html }}
              />
              {phase === "streaming" && (
                <div className="no-print px-6 pb-6 text-sm text-slate-500">
                  Writing your lesson…
                </div>
              )}
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
