import { redirect } from "next/navigation";
import { QuizClient } from "@/components/QuizClient";
import { createClient } from "@/lib/supabase/server";
import { getProfile, rowToPersona } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const supabase = createClient();
  const persona = rowToPersona(await getProfile(supabase));
  if (!persona) redirect("/onboarding");

  return <QuizClient persona={persona} />;
}
