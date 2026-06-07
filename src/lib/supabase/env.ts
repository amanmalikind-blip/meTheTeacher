// Centralised, sanitized Supabase env values. NEXT_PUBLIC_* vars are inlined at
// build time and work in both client and server bundles.
//
// We reduce the URL to its origin (scheme://host) so that a pasted value with an
// extra path like "/rest/v1" or a trailing slash can't corrupt the request paths
// supabase-js builds (which would cause "Invalid path specified in request URL").

function cleanUrl(raw: string | undefined): string {
  const v = (raw || "").trim();
  if (!v) return "";
  try {
    return new URL(v).origin;
  } catch {
    return v.replace(/\/+$/, "");
  }
}

export const SUPABASE_URL = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const SUPABASE_ANON_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
).trim();
