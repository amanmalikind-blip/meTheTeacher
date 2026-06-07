import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(supabase);
  const name = profile?.full_name || user.email || "Student";

  return (
    <div className="lg:flex min-h-screen">
      <AppNav name={name} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
