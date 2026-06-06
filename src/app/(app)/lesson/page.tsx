import { redirect } from "next/navigation";
import { LessonClient } from "@/components/LessonClient";
import { createClient } from "@/lib/supabase/server";
import { getProfile, rowToPersona } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  searchParams
}: {
  searchParams: { chapter?: string };
}) {
  const supabase = createClient();
  const persona = rowToPersona(await getProfile(supabase));
  if (!persona) redirect("/onboarding");

  return <LessonClient persona={persona} initialChapter={searchParams.chapter} />;
}
