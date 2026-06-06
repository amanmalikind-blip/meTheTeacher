"use client";

import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CBSE_CLASSES,
  CHARACTERS,
  COMFORT_LEVELS,
  FREE_LESSON_LIMIT,
  INTERESTS,
  LANGUAGES,
  TEACHING_STYLES,
  interestLabel,
  subjectLabel,
  subjectsForClass
} from "@/lib/constants";
import {
  DEFAULT_PERSONA,
  isCompletePersona,
  loadPersona,
  savePersona,
  type Persona
} from "@/lib/persona";
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
type Screen = "persona" | "lesson";

export default function LessonPage() {
  const [screen, setScreen] = useState<Screen>("persona");
  const [draft, setDraft] = useState<Persona>(DEFAULT_PERSONA);
  const [persona, setPersona] = useState<Persona | null>(null);

  const [chapter, setChapter] = useState("");
  const [html, setHtml] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(FREE_LESSON_LIMIT);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadPersona();
    if (saved) {
      setDraft(saved);
      setPersona(saved);
      setScreen("lesson");
    }
    setRemaining(lessonsRemaining());
    setVoices(listVoices());
    const off = onVoicesChanged(() => setVoices(listVoices()));
    setHydrated(true);
    return () => {
      off();
      abortRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  const filteredVoices = useMemo(() => {
    const lang = LANGUAGES.find((l) => l.id === (persona ?? draft).language);
    if (!lang) return voices;
    const base = lang.bcp47.split("-")[0];
    const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
    return matching.length > 0 ? matching : voices;
  }, [voices, persona, draft]);

  // The lesson HTML is model-generated; sanitize before rendering or reading.
  const safeHtml = useMemo(() => DOMPurify.sanitize(html), [html]);

  if (!hydrated) {
    return <main className="mx-auto max-w-5xl px-6 py-16">Loading…</main>;
  }

  // ---- Persona draft helpers ----
  const setField = <K extends keyof Persona>(key: K, value: Persona[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      // When class changes, make sure the subject still belongs to it.
      if (key === "klass") {
        const list = subjectsForClass(value as Persona["klass"]);
        if (!list.some((s) => s.id === next.subject)) {
          next.subject = list[0]?.id ?? next.subject;
        }
      }
      return next;
    });
  };

  const toggleInterest = (id: string) => {
    setDraft((prev) => {
      const has = prev.interests.includes(id);
      const interests = has
        ? prev.interests.filter((x) => x !== id)
        : [...prev.interests, id];
      return { ...prev, interests };
    });
  };

  const personaComplete = isCompletePersona(draft);

  const onSavePersona = () => {
    if (!personaComplete) return;
    savePersona(draft);
    setPersona(draft);
    setScreen("lesson");
  };

  // ---- Lesson generation ----
  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!persona) return;
    if (!chapter.trim()) {
      setErrorMsg("Please enter a chapter or topic name.");
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
        body: JSON.stringify({ ...persona, chapter: chapter.trim() }),
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

      incrementLessonCount();
      setRemaining(Math.max(0, FREE_LESSON_LIMIT - getLessonCount()));
      setPhase("done");
    } catch (err) {
      if (controller.signal.aborted) return;
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setPhase("error");
    }
  };

  const toggleSpeak = () => {
    if (!html || !persona) return;
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

  const onExportPdf = () => {
    if (typeof window !== "undefined") window.print();
  };

  // ===================== PERSONA SCREEN =====================
  if (screen === "persona") {
    const subjects = subjectsForClass(draft.klass);
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <nav className="mb-6">
          <Link href="/" className="text-brand-600 font-semibold hover:underline">
            ← meTheTeacher
          </Link>
        </nav>

        <h1 className="text-3xl font-bold">Let&apos;s get to know you 👋</h1>
        <p className="mt-2 text-slate-600">
          Answer a few quick questions. Your AI teacher will explain every
          chapter using analogies from things <em>you</em> actually enjoy.
        </p>

        <div className="mt-8 space-y-8">
          {/* Class */}
          <Field label="Which class are you in?">
            <div className="flex gap-3">
              {CBSE_CLASSES.map((c) => (
                <Chip
                  key={c.id}
                  active={draft.klass === c.id}
                  onClick={() => setField("klass", c.id)}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Subject */}
          <Field label="Which subject do you want help with?">
            <select
              value={draft.subject}
              onChange={(e) => setField("subject", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Interests */}
          <Field
            label="What are you into? (pick a few — we'll build analogies from these)"
            hint={
              draft.interests.length === 0
                ? "Pick at least one"
                : `${draft.interests.length} selected`
            }
          >
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip
                  key={i.id}
                  active={draft.interests.includes(i.id)}
                  onClick={() => toggleInterest(i.id)}
                >
                  {i.label}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Comfort */}
          <Field label="How confident are you with this subject right now?">
            <div className="flex flex-wrap gap-3">
              {COMFORT_LEVELS.map((c) => (
                <Chip
                  key={c.id}
                  active={draft.comfort === c.id}
                  onClick={() => setField("comfort", c.id)}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Teaching style */}
          <Field label="How do you like things explained?">
            <select
              value={draft.style}
              onChange={(e) =>
                setField("style", e.target.value as Persona["style"])
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {TEACHING_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {s.hint}
                </option>
              ))}
            </select>
          </Field>

          {/* Character + Language */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Field label="Pick your teacher's vibe">
              <select
                value={draft.character}
                onChange={(e) =>
                  setField("character", e.target.value as Persona["character"])
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
                {CHARACTERS.find((c) => c.id === draft.character)?.persona}
              </p>
            </Field>

            <Field label="Language">
              <select
                value={draft.language}
                onChange={(e) =>
                  setField("language", e.target.value as Persona["language"])
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <button
          type="button"
          onClick={onSavePersona}
          disabled={!personaComplete}
          className="mt-8 w-full rounded-lg bg-brand-600 text-white font-semibold py-3 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
        >
          Save my profile & start learning →
        </button>
        {!personaComplete && (
          <p className="mt-2 text-center text-sm text-slate-500">
            Pick your class, subject and at least one interest to continue.
          </p>
        )}
      </main>
    );
  }

  // ===================== LESSON SCREEN =====================
  const p = persona!;
  const quotaBanner = quotaExceeded() ? (
    <div className="no-print rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 text-sm">
      You&apos;ve used all {FREE_LESSON_LIMIT} free lessons.
    </div>
  ) : (
    <div className="no-print text-sm text-slate-600">
      {remaining} of {FREE_LESSON_LIMIT} free lessons left
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <nav className="no-print flex items-center justify-between mb-6">
        <Link href="/" className="text-brand-600 font-semibold hover:underline">
          ← meTheTeacher
        </Link>
        {quotaBanner}
      </nav>

      <div className="grid lg:grid-cols-[340px_1fr] gap-8">
        <div className="no-print h-fit lg:sticky lg:top-4 space-y-4">
          {/* Persona summary card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Your profile</h2>
              <button
                type="button"
                onClick={() => setScreen("persona")}
                className="text-xs text-brand-600 hover:underline"
              >
                Edit
              </button>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm text-slate-600">
              <Row k="Class" v={`Class ${p.klass}`} />
              <Row k="Subject" v={subjectLabel(p.subject)} />
              <Row
                k="Interests"
                v={p.interests
                  .map((i) => interestLabel(i).replace(/^\W+\s*/, ""))
                  .join(", ")}
              />
              <Row
                k="Style"
                v={TEACHING_STYLES.find((s) => s.id === p.style)?.label ?? p.style}
              />
              <Row
                k="Teacher"
                v={CHARACTERS.find((c) => c.id === p.character)?.label ?? p.character}
              />
              <Row
                k="Language"
                v={LANGUAGES.find((l) => l.id === p.language)?.label ?? p.language}
              />
            </dl>
          </div>

          {/* Chapter form */}
          <form
            onSubmit={onGenerate}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
          >
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Which chapter or topic?
            </label>
            <input
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="e.g. Chemical Reactions and Equations"
              maxLength={200}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />

            {/* Voice picker */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Read-aloud voice
              </label>
              <select
                value={p.voiceURI ?? ""}
                onChange={(e) => {
                  const next = { ...p, voiceURI: e.target.value || undefined };
                  setPersona(next);
                  savePersona(next);
                }}
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
            </div>

            <button
              type="submit"
              disabled={phase === "streaming" || quotaExceeded()}
              className="mt-6 w-full rounded-lg bg-brand-600 text-white font-semibold py-2.5 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
            >
              {phase === "streaming" ? "Teaching…" : "Explain this to me"}
            </button>

            {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
          </form>
        </div>

        <section>
          {phase === "idle" && !html && (
            <div className="rounded-xl bg-white border border-dashed border-slate-300 p-10 text-center text-slate-500">
              Type a chapter name and click{" "}
              <span className="font-semibold">Explain this to me</span>. Your
              lesson — full of analogies from{" "}
              {p.interests
                .slice(0, 2)
                .map((i) => interestLabel(i).replace(/^\W+\s*/, ""))
                .join(" & ") || "your interests"}{" "}
              — will appear here.
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
                dangerouslySetInnerHTML={{ __html: safeHtml }}
              />
              {phase === "streaming" && (
                <div className="no-print px-6 pb-6 text-sm text-slate-500">
                  Your teacher is writing…
                </div>
              )}
            </article>
          )}
        </section>
      </div>
    </main>
  );
}

// ---- Small presentational helpers ----
function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          {label}
        </label>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-brand-600 border-brand-600 text-white"
          : "bg-white border-slate-300 text-slate-700 hover:border-brand-400"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="font-medium text-slate-500 shrink-0">{k}:</dt>
      <dd className="text-slate-800">{v}</dd>
    </div>
  );
}
