import { redirect } from "next/navigation";
import { PersonaForm } from "@/components/PersonaForm";
import { createClient } from "@/lib/supabase/server";
import { getProfile, rowToPersona } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createClient();
  const profile = await getProfile(supabase);
  const persona = rowToPersona(profile);
  if (!persona) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PersonaForm
        initial={persona}
        redirectTo="/dashboard"
        heading="Your profile ⚙️"
        submitLabel="Save changes"
      />
    </div>
  );
}
