// Centralised, sanitized Supabase env values. NEXT_PUBLIC_* vars are inlined at
// build time and work in both client and server bundles. We trim whitespace and
// strip any trailing slash from the URL — a trailing slash produces a double
// slash in request paths and Supabase rejects it with
// "Invalid path specified in request URL".

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

export const SUPABASE_ANON_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
).trim();
