import type { SupabaseClient } from "@supabase/supabase-js";
import { isCompletePersona, type Persona } from "./persona";
import type { ClassId } from "./constants";

// Loosely-typed Supabase client (we don't generate DB types).
export type DB = SupabaseClient;

export type ProfileRow = {
  id: string;
  full_name: string | null;
  klass: string | null;
  subject: string | null;
  interests: string[] | null;
  comfort: string | null;
  style: string | null;
  character: string | null;
  language: string | null;
  voice_uri: string | null;
  onboarded: boolean;
};

export type LessonRow = {
  id: string;
  klass: string | null;
  subject: string | null;
  chapter: string;
  language: string | null;
  style: string | null;
  character: string | null;
  html: string;
  saved: boolean;
  created_at: string;
};

export type QuizAttemptRow = {
  id: string;
  klass: string | null;
  subject: string | null;
  chapter: string;
  total: number;
  score: number;
  created_at: string;
};

export function rowToPersona(row: ProfileRow | null): Persona | null {
  if (!row) return null;
  const candidate: Partial<Persona> = {
    klass: (row.klass as ClassId) ?? undefined,
    subject: row.subject ?? undefined,
    interests: row.interests ?? [],
    comfort: (row.comfort as Persona["comfort"]) ?? undefined,
    style: (row.style as Persona["style"]) ?? undefined,
    character: (row.character as Persona["character"]) ?? undefined,
    language: (row.language as Persona["language"]) ?? undefined,
    voiceURI: row.voice_uri ?? undefined
  };
  return isCompletePersona(candidate) ? candidate : null;
}

export async function getProfile(db: DB): Promise<ProfileRow | null> {
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as ProfileRow) ?? null;
}

export async function savePersona(db: DB, persona: Persona): Promise<void> {
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await db
    .from("profiles")
    .upsert({
      id: user.id,
      klass: persona.klass,
      subject: persona.subject,
      interests: persona.interests,
      comfort: persona.comfort,
      style: persona.style,
      character: persona.character,
      language: persona.language,
      voice_uri: persona.voiceURI ?? null,
      onboarded: true,
      updated_at: new Date().toISOString()
    });
  if (error) throw error;
}

export async function saveLesson(
  db: DB,
  lesson: {
    klass: string;
    subject: string;
    chapter: string;
    language: string;
    style: string;
    character: string;
    html: string;
  }
): Promise<string | null> {
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data, error } = await db
    .from("lessons")
    .insert({ ...lesson, user_id: user.id })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string })?.id ?? null;
}

export async function listLessons(db: DB, limit = 50): Promise<LessonRow[]> {
  const { data } = await db
    .from("lessons")
    .select("id, klass, subject, chapter, language, style, character, saved, created_at, html")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as LessonRow[]) ?? [];
}

export async function getLesson(db: DB, id: string): Promise<LessonRow | null> {
  const { data } = await db.from("lessons").select("*").eq("id", id).maybeSingle();
  return (data as LessonRow) ?? null;
}

export async function deleteLesson(db: DB, id: string): Promise<void> {
  const { error } = await db.from("lessons").delete().eq("id", id);
  if (error) throw error;
}

export async function saveQuizAttempt(
  db: DB,
  attempt: {
    klass: string;
    subject: string;
    chapter: string;
    total: number;
    score: number;
    questions: unknown;
    answers: unknown;
  }
): Promise<void> {
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await db
    .from("quiz_attempts")
    .insert({ ...attempt, user_id: user.id });
  if (error) throw error;
}

export async function listQuizAttempts(
  db: DB,
  limit = 50
): Promise<QuizAttemptRow[]> {
  const { data } = await db
    .from("quiz_attempts")
    .select("id, klass, subject, chapter, total, score, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as QuizAttemptRow[]) ?? [];
}

export type DashboardStats = {
  lessonCount: number;
  quizCount: number;
  avgScorePct: number | null;
  streakDays: number;
  recentLessons: LessonRow[];
  bySubject: { subject: string; lessons: number }[];
};

// Computes streak (consecutive days with any activity, ending today/yesterday).
function computeStreak(dates: string[]): number {
  const days = new Set(dates.map((d) => d.slice(0, 10)));
  if (days.size === 0) return 0;
  const oneDay = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Allow the streak to count if the latest activity was today or yesterday.
  let cursor = today.getTime();
  if (!days.has(new Date(cursor).toISOString().slice(0, 10))) {
    cursor -= oneDay;
    if (!days.has(new Date(cursor).toISOString().slice(0, 10))) return 0;
  }
  let streak = 0;
  while (days.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= oneDay;
  }
  return streak;
}

export async function getDashboardStats(db: DB): Promise<DashboardStats> {
  const [lessons, quizzes] = await Promise.all([
    listLessons(db, 200),
    listQuizAttempts(db, 200)
  ]);

  const avgScorePct =
    quizzes.length > 0
      ? Math.round(
          (quizzes.reduce(
            (sum, q) => sum + (q.total > 0 ? q.score / q.total : 0),
            0
          ) /
            quizzes.length) *
            100
        )
      : null;

  const bySubjectMap = new Map<string, number>();
  for (const l of lessons) {
    const key = l.subject ?? "other";
    bySubjectMap.set(key, (bySubjectMap.get(key) ?? 0) + 1);
  }

  return {
    lessonCount: lessons.length,
    quizCount: quizzes.length,
    avgScorePct,
    streakDays: computeStreak([
      ...lessons.map((l) => l.created_at),
      ...quizzes.map((q) => q.created_at)
    ]),
    recentLessons: lessons.slice(0, 5),
    bySubject: Array.from(bySubjectMap.entries())
      .map(([subject, n]) => ({ subject, lessons: n }))
      .sort((a, b) => b.lessons - a.lessons)
  };
}
