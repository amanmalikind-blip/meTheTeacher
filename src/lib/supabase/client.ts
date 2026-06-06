"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client (uses the public anon key + the user's session
// cookie). Safe to expose — RLS enforces per-user access.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
