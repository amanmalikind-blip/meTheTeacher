"use client";

import DOMPurify from "isomorphic-dompurify";
import { useMemo, useRef, useState } from "react";
import { LANGUAGES, interestLabel, subjectLabel } from "@/lib/constants";
import { chaptersFor } from "@/lib/chapters";
import type { Persona } from "@/lib/persona";
import { saveLesson } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { htmlToPlainText, speak, stopSpeaking } from "@/lib/tts";

type Phase = "idle" | "streaming" | "done" | "error";

export function LessonClient({
  persona,
  initialChapter
}: {
  persona: Persona;
  initialChapter?: string;
}) {
  const chapterOptions = chaptersFor(persona.klass, persona.subject);

  const [chapter, setChapter] = useState(initialChapter ?? "");
  const [useCustom, setUseCustom] = useState(
    !!initialChapter && !chapterOptions.includes(initialChapter)
  );
  const [html, setHtml] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const safeHtml = useMemo(() => DOMPurify.sanitize(html), [html]);

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!chapter.trim()) {
      setErrorMsg("Please choose or enter a chapter.");
      return;
    }

    stopSpeaking();
    setIsSpeaking(false);
    setHtml("");
    setLessonId(null);
    setPhase("streaming");

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...persona, chapter: chapter.trim() }),
        signal: controller.signal
      });

      if (!res.ok || !res.body) {
        let msg = `Request failed (${res.status}).`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) msg = data.error;
        } catch {
          /* ignore */
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
      setPhase("done");

      // Persist the finished lesson for the dashboard + library.
      try {
        const supabase = createClient();
        const id = await saveLesson(supabase, {
          klass: persona.klass,
          subject: persona.subject,
          chapter: chapter.trim(),
          language: persona.language,
          style: persona.style,
          character: persona.character,
          html: acc
        });
        setLessonId(id);
      } catch {
        /* non-fatal: lesson still shows, just not saved */
      }
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
    const lang = LANGUAGES.find((l) => l.id === persona.language)?.bcp47 ?? "en-IN";
    const utter = speak(htmlToPlainText(safeHtml), {
      voiceURI: persona.voiceURI,
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold">Learn a chapter</h1>
      <p className="mt-1 text-slate-600">
        Class {persona.klass} · {subjectLabel(persona.subject)} · explained with{" "}
        {persona.interests
          .slice(0, 2)
          .map((i) => interestLabel(i).replace(/^\W+\s*/, ""))
          .join(" & ") || "your interests"}
        {persona.city?.trim() ? ` · ${persona.city.trim()} flavour` : ""}
      </p>

      <div className="mt-6 grid lg:grid-cols-[340px_1fr] gap-8">
        <form
          onSubmit={onGenerate}
          className="no-print h-fit lg:sticky lg:top-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
        >
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Which chapter?
          </label>
          {chapterOptions.length > 0 && (
            <select
              value={useCustom ? "__other__" : chapter}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__other__") {
                  setUseCustom(true);
                  setChapter("");
                } else {
                  setUseCustom(false);
                  setChapter(v);
                }
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select a chapter…</option>
              {chapterOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__other__">✏️ Other / my own topic</option>
            </select>
          )}
          {(useCustom || chapterOptions.length === 0) && (
            <input
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="e.g. Chemical Reactions and Equations"
              maxLength={200}
              className={`w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                chapterOptions.length > 0 ? "mt-2" : ""
              }`}
              required
            />
          )}

          <button
            type="submit"
            disabled={phase === "streaming"}
            className="mt-6 w-full rounded-lg bg-brand-600 text-white font-semibold py-2.5 hover:bg-brand-700 disabled:bg-slate-300 transition"
          >
            {phase === "streaming" ? "Teaching…" : "Explain this to me"}
          </button>
          {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
        </form>

        <section>
          {phase === "idle" && !html && (
            <div className="rounded-xl bg-white border border-dashed border-slate-300 p-10 text-center text-slate-500">
              Choose a chapter and click{" "}
              <span className="font-semibold">Explain this to me</span>.
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
                  onClick={() => window.print()}
                  disabled={!html || phase === "streaming"}
                  className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  Export to PDF
                </button>
              </div>
              <div
                className="lesson-html px-6 py-6"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
              />
              {phase === "streaming" && (
                <div className="no-print px-6 pb-6 text-sm text-slate-500">
                  Your teacher is writing…
                </div>
              )}
            </article>
          )}

          {phase === "done" && html && (
            <DoubtChat persona={persona} chapter={chapter.trim()} lessonId={lessonId} />
          )}
        </section>
      </div>
    </div>
  );
}

// --- Doubt-chat: ask follow-up questions on the current lesson ---
function DoubtChat({
  persona,
  chapter,
  lessonId
}: {
  persona: Persona;
  chapter: string;
  lessonId: string | null;
}) {
  const [items, setItems] = useState<{ q: string; a: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setQuestion("");
    setItems((prev) => [...prev, { q, a: "" }]);
    const idx = items.length;

    try {
      const res = await fetch("/api/doubt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...persona, chapter, question: q })
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setItems((prev) => {
          const copy = [...prev];
          copy[idx] = { q, a: acc };
          return copy;
        });
      }
      try {
        const supabase = createClient();
        await supabase.from("doubts").insert({
          lesson_id: lessonId,
          question: q,
          answer: acc,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });
      } catch {
        /* non-fatal */
      }
    } catch (err) {
      setItems((prev) => {
        const copy = [...prev];
        copy[idx] = {
          q,
          a: err instanceof Error ? err.message : "Something went wrong."
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print mt-6 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="font-semibold">Still confused? Ask a doubt 💬</h3>
      <div className="mt-3 space-y-3">
        {items.map((it, i) => (
          <div key={i}>
            <p className="text-sm font-medium text-slate-800">🙋 {it.q}</p>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
              {it.a || "…"}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={ask} className="mt-4 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Why does this reaction need heat?"
          maxLength={300}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="rounded-lg bg-brand-600 text-white font-semibold px-4 py-2 hover:bg-brand-700 disabled:bg-slate-300 transition"
        >
          {busy ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
