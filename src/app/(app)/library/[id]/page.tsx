import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLesson, getProfile, rowToPersona } from "@/lib/db";
import { subjectLabel } from "@/lib/constants";
import { LibraryView } from "@/components/LibraryView";

export const dynamic = "force-dynamic";

export default async function LibraryItemPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const persona = rowToPersona(await getProfile(supabase));
  if (!persona) redirect("/onboarding");

  const lesson = await getLesson(supabase, params.id);
  if (!lesson) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <nav className="no-print mb-4">
        <Link href="/library" className="text-brand-600 font-semibold hover:underline">
          ← Library
        </Link>
      </nav>
      <p className="no-print text-sm text-slate-500">
        {lesson.subject ? subjectLabel(lesson.subject) : ""}
        {lesson.klass ? ` · Class ${lesson.klass}` : ""}
      </p>
      <LibraryView id={lesson.id} html={lesson.html} />
    </div>
  );
}
