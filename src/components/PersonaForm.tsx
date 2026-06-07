"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CBSE_CLASSES,
  CHARACTERS,
  COMFORT_LEVELS,
  INTERESTS,
  LANGUAGES,
  POPULAR_CITIES,
  TEACHING_STYLES,
  subjectsForClass
} from "@/lib/constants";
import {
  DEFAULT_PERSONA,
  isCompletePersona,
  type Persona
} from "@/lib/persona";
import { savePersona } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";

export function PersonaForm({
  initial,
  redirectTo = "/dashboard",
  heading = "Let's get to know you 👋",
  submitLabel = "Save & start learning →"
}: {
  initial?: Persona | null;
  redirectTo?: string;
  heading?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Persona>(initial ?? DEFAULT_PERSONA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof Persona>(key: K, value: Persona[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
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
      return {
        ...prev,
        interests: has
          ? prev.interests.filter((x) => x !== id)
          : [...prev.interests, id]
      };
    });
  };

  const complete = isCompletePersona(draft);
  const subjects = subjectsForClass(draft.klass);

  const onSubmit = async () => {
    if (!complete) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      await savePersona(supabase, draft);
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile.");
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">{heading}</h1>
      <p className="mt-2 text-slate-600">
        Your AI teacher will explain every chapter using analogies from things{" "}
        <em>you</em> actually enjoy.
      </p>

      <div className="mt-8 space-y-8">
        <Field label="Which class are you in?">
          <div className="flex gap-3">
            {CBSE_CLASSES.map((c) => (
              <Chip key={c.id} active={draft.klass === c.id} onClick={() => setField("klass", c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </Field>

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

        <Field
          label="Which city are you from?"
          hint="optional — for local food & hangout analogies"
        >
          <input
            type="text"
            list="city-options"
            value={draft.city ?? ""}
            onChange={(e) => setField("city", e.target.value)}
            placeholder="e.g. Lucknow"
            maxLength={60}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <datalist id="city-options">
            {POPULAR_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field
          label="What are you into? (we build analogies from these)"
          hint={draft.interests.length === 0 ? "Pick at least one" : `${draft.interests.length} selected`}
        >
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <Chip key={i.id} active={draft.interests.includes(i.id)} onClick={() => toggleInterest(i.id)}>
                {i.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="How confident are you with this subject right now?">
          <div className="flex flex-wrap gap-3">
            {COMFORT_LEVELS.map((c) => (
              <Chip key={c.id} active={draft.comfort === c.id} onClick={() => setField("comfort", c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="How do you like things explained?">
          <select
            value={draft.style}
            onChange={(e) => setField("style", e.target.value as Persona["style"])}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {TEACHING_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.hint}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid sm:grid-cols-2 gap-6">
          <Field label="Pick your teacher's vibe">
            <select
              value={draft.character}
              onChange={(e) => setField("character", e.target.value as Persona["character"])}
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
              onChange={(e) => setField("language", e.target.value as Persona["language"])}
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
        onClick={onSubmit}
        disabled={!complete || saving}
        className="mt-8 w-full rounded-lg bg-brand-600 text-white font-semibold py-3 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
      {!complete && (
        <p className="mt-2 text-center text-sm text-slate-500">
          Pick your class, subject and at least one interest to continue.
        </p>
      )}
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}

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
        <label className="block text-sm font-semibold text-slate-800 mb-2">{label}</label>
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
