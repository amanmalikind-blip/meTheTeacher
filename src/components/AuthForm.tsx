"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_ANON_KEY } from "@/lib/supabase/env";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg bg-brand-600 text-white font-semibold py-2.5 hover:bg-brand-700 disabled:bg-slate-300 transition"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

export function AuthForm({
  mode,
  next
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction] = useFormState<AuthState, FormData>(action, null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setOauthError(null);
    setBusyProvider("google");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            next || "/dashboard"
          )}`,
          // Build the redirect ourselves so we can guarantee the apikey is
          // attached to the /authorize request (Supabase's gateway requires it).
          skipBrowserRedirect: true
        }
      });
      if (error) {
        setOauthError(error.message);
        setBusyProvider(null);
        return;
      }
      if (data?.url) {
        const authUrl = new URL(data.url);
        if (SUPABASE_ANON_KEY && !authUrl.searchParams.get("apikey")) {
          authUrl.searchParams.set("apikey", SUPABASE_ANON_KEY);
        }
        window.location.assign(authUrl.toString());
      }
    } catch (e) {
      setOauthError(e instanceof Error ? e.message : "Could not start sign-in.");
      setBusyProvider(null);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Link href="/" className="text-brand-600 font-semibold hover:underline">
        ← meTheTeacher
      </Link>
      <h1 className="mt-6 text-3xl font-bold">
        {mode === "login" ? "Welcome back 👋" : "Create your account"}
      </h1>
      <p className="mt-2 text-slate-600">
        {mode === "login"
          ? "Sign in to pick up where you left off."
          : "Start learning CBSE chapters your way — it's free."}
      </p>

      {/* Social sign-in */}
      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={!!busyProvider}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
        >
          <GoogleIcon />
          {busyProvider === "google" ? "Redirecting…" : "Continue with Google"}
        </button>
        {oauthError && <p className="text-sm text-red-600">{oauthError}</p>}
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or use email
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        {mode === "register" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full name
            </label>
            <input
              name="full_name"
              type="text"
              autoComplete="name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Aman Malik"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="••••••••"
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <SubmitButton label={mode === "login" ? "Sign in" : "Create account"} />
      </form>

      <p className="mt-6 text-sm text-slate-600">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/register" className="text-brand-600 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-brand-600 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

