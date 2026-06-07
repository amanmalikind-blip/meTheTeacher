import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, listLessons, rowToPersona } from "@/lib/db";
import { subjectLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const supabase = createClient();
  const persona = rowToPersona(await getProfile(supabase));
  if (!persona) redirect("/onboarding");

  const lessons = await listLessons(supabase, 100);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold">Your library 📚</h1>
      <p className="mt-1 text-slate-600">Every lesson you&apos;ve generated, saved for revision.</p>

      {lessons.length === 0 ? (
        <div className="mt-6 rounded-xl bg-white border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Nothing here yet.{" "}
          <Link href="/lesson" className="text-brand-600 hover:underline">
            Generate your first lesson →
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid sm:grid-cols-2 gap-4">
          {lessons.map((l) => (
            <li key={l.id}>
              <Link
                href={`/library/${l.id}`}
                className="block rounded-xl bg-white border border-slate-200 p-5 shadow-sm hover:border-brand-300 transition h-full"
              >
                <p className="font-semibold text-slate-900">{l.chapter}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {l.subject ? subjectLabel(l.subject) : ""}
                  {l.klass ? ` · Class ${l.klass}` : ""}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(l.created_at).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
