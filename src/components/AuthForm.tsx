"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";

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

      <form action={formAction} className="mt-8 space-y-4">
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

        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

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
