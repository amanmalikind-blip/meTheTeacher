"use client";

import { useState } from "react";
import { subjectLabel } from "@/lib/constants";
import { chaptersFor } from "@/lib/chapters";
import type { Persona } from "@/lib/persona";
import { saveQuizAttempt } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";

type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};
type Stage = "setup" | "loading" | "taking" | "result";

export function QuizClient({ persona }: { persona: Persona }) {
  const chapterOptions = chaptersFor(persona.klass, persona.subject);

  const [chapter, setChapter] = useState("");
  const [useCustom, setUseCustom] = useState(chapterOptions.length === 0);
  const [count, setCount] = useState(5);
  const [stage, setStage] = useState<Stage>("setup");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!chapter.trim()) {
      setError("Please choose a chapter.");
      return;
    }
    setStage("loading");
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          klass: persona.klass,
          subject: persona.subject,
          language: persona.language,
          chapter: chapter.trim(),
          count
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
      setQuestions(data.questions as Question[]);
      setAnswers(new Array((data.questions as Question[]).length).fill(-1));
      setStage("taking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the quiz.");
      setStage("setup");
    }
  };

  const submit = async () => {
    const score = questions.reduce(
      (s, q, i) => s + (answers[i] === q.correctIndex ? 1 : 0),
      0
    );
    setStage("result");
    try {
      const supabase = createClient();
      await saveQuizAttempt(supabase, {
        klass: persona.klass,
        subject: persona.subject,
        chapter: chapter.trim(),
        total: questions.length,
        score,
        questions,
        answers
      });
    } catch {
      /* non-fatal */
    }
  };

  const reset = () => {
    setStage("setup");
    setQuestions([]);
    setAnswers([]);
  };

  const score = questions.reduce(
    (s, q, i) => s + (answers[i] === q.correctIndex ? 1 : 0),
    0
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">Practice quiz</h1>
      <p className="mt-1 text-slate-600">
        Class {persona.klass} · {subjectLabel(persona.subject)}
      </p>

      {stage === "setup" && (
        <form onSubmit={startQuiz} className="mt-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1">Chapter</label>
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
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
              placeholder="e.g. Electricity"
              maxLength={200}
              className={`w-full rounded-lg border border-slate-300 px-3 py-2 ${chapterOptions.length > 0 ? "mt-2" : ""}`}
            />
          )}

          <label className="block text-sm font-medium text-slate-700 mb-1 mt-4">
            Number of questions
          </label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {[3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n} questions
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-brand-600 text-white font-semibold py-2.5 hover:bg-brand-700 transition"
          >
            Generate quiz
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </form>
      )}

      {stage === "loading" && (
        <div className="mt-6 rounded-xl bg-white border border-slate-200 p-10 text-center text-slate-500">
          Writing your quiz on <span className="font-semibold">{chapter}</span>…
        </div>
      )}

      {(stage === "taking" || stage === "result") && (
        <div className="mt-6 space-y-5">
          {stage === "result" && (
            <div className="rounded-xl bg-brand-50 border border-brand-100 p-5 text-center">
              <p className="text-3xl font-bold text-brand-700">
                {score} / {questions.length}
              </p>
              <p className="text-slate-600 mt-1">
                {score === questions.length
                  ? "Perfect! 🎉"
                  : score >= questions.length / 2
                    ? "Good effort — review the misses below."
                    : "Keep going — review the answers and try again."}
              </p>
            </div>
          )}

          {questions.map((q, i) => (
            <div key={i} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
              <p className="font-medium text-slate-900">
                {i + 1}. {q.question}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => {
                  const chosen = answers[i] === oi;
                  const isCorrect = q.correctIndex === oi;
                  const showResult = stage === "result";
                  return (
                    <label
                      key={oi}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                        showResult
                          ? isCorrect
                            ? "border-green-400 bg-green-50"
                            : chosen
                              ? "border-red-300 bg-red-50"
                              : "border-slate-200"
                          : chosen
                            ? "border-brand-400 bg-brand-50"
                            : "border-slate-200 hover:border-brand-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q${i}`}
                        checked={chosen}
                        disabled={stage === "result"}
                        onChange={() =>
                          setAnswers((prev) => {
                            const c = [...prev];
                            c[i] = oi;
                            return c;
                          })
                        }
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
              {stage === "result" && (
                <p className="mt-2 text-xs text-slate-500">💡 {q.explanation}</p>
              )}
            </div>
          ))}

          {stage === "taking" ? (
            <button
              onClick={submit}
              disabled={answers.some((a) => a === -1)}
              className="w-full rounded-lg bg-brand-600 text-white font-semibold py-2.5 hover:bg-brand-700 disabled:bg-slate-300 transition"
            >
              {answers.some((a) => a === -1) ? "Answer all questions to submit" : "Submit answers"}
            </button>
          ) : (
            <button
              onClick={reset}
              className="w-full rounded-lg border border-slate-300 font-semibold py-2.5 hover:bg-slate-100 transition"
            >
              New quiz
            </button>
          )}
        </div>
      )}
    </div>
  );
}
