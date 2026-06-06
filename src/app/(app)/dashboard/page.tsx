import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardStats, getProfile, rowToPersona } from "@/lib/db";
import { subjectLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const profile = await getProfile(supabase);
  const persona = rowToPersona(profile);
  if (!persona) redirect("/onboarding");

  const stats = await getDashboardStats(supabase);
  const firstName = (profile?.full_name || "there").split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hi {firstName} 👋</h1>
          <p className="mt-1 text-slate-600">
            Class {persona.klass} · {subjectLabel(persona.subject)}
          </p>
        </div>
        <Link
          href="/lesson"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-white font-semibold hover:bg-brand-700 transition"
        >
          Learn a chapter →
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Day streak" value={`${stats.streakDays}🔥`} />
        <Stat label="Lessons" value={String(stats.lessonCount)} />
        <Stat label="Quizzes" value={String(stats.quizCount)} />
        <Stat
          label="Avg. quiz score"
          value={stats.avgScorePct === null ? "—" : `${stats.avgScorePct}%`}
        />
      </div>

      <div className="mt-10 grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="font-semibold text-lg mb-3">Recent lessons</h2>
          {stats.recentLessons.length === 0 ? (
            <EmptyCard>
              No lessons yet.{" "}
              <Link href="/lesson" className="text-brand-600 hover:underline">
                Start your first one →
              </Link>
            </EmptyCard>
          ) : (
            <ul className="space-y-2">
              {stats.recentLessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/library/${l.id}`}
                    className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-4 py-3 hover:border-brand-300 transition"
                  >
                    <span className="font-medium text-slate-800 truncate">
                      {l.chapter}
                    </span>
                    <span className="text-xs text-slate-500 shrink-0 ml-3">
                      {l.subject ? subjectLabel(l.subject) : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-semibold text-lg mb-3">Lessons by subject</h2>
          {stats.bySubject.length === 0 ? (
            <EmptyCard>Your subject breakdown will appear here.</EmptyCard>
          ) : (
            <ul className="space-y-3">
              {stats.bySubject.map((s) => {
                const max = stats.bySubject[0].lessons || 1;
                return (
                  <li key={s.subject}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700">
                        {subjectLabel(s.subject)}
                      </span>
                      <span className="text-slate-500">{s.lessons}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${(s.lessons / max) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/quiz"
          className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          📝 Take a quiz
        </Link>
        <Link
          href="/library"
          className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          📚 Open library
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-dashed border-slate-300 p-6 text-slate-500 text-sm">
      {children}
    </div>
  );
}
