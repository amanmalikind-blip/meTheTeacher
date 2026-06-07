import { PersonaForm } from "@/components/PersonaForm";
import { createClient } from "@/lib/supabase/server";
import { getProfile, rowToPersona } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = createClient();
  const persona = rowToPersona(await getProfile(supabase));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PersonaForm initial={persona} redirectTo="/dashboard" />
    </div>
  );
}
