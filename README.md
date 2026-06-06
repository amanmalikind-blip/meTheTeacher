# meTheTeacher

An AI study platform for **CBSE Class 10 & 12** students. Each student creates an
account and answers a short questionnaire that captures their **persona** — class,
subject, interests/hobbies, confidence level, preferred teaching style, teacher
"vibe" and language. An agentic AI then explains any chapter simply, like a
teacher, using **analogies and examples drawn from things that student actually
enjoys** (cricket, gaming, movies, music, …). Progress, lessons and quizzes are
saved to their account and sync across devices.

- **Accounts + cloud sync**: email/password login; persona, lessons, quizzes and progress persist across devices.
- **Persona-driven lessons**: explanations built around each student's interests, CBSE-aligned and pitched to their class.
- **Chapter dropdowns**: real NCERT chapter lists per subject (plus a free-text option).
- **Quizzes & mock tests**: auto-generated MCQs per chapter with scoring, review and explanations.
- **Doubt-chat**: ask follow-up questions on any lesson and get persona-style answers.
- **Library + dashboard**: revisit saved lessons; track streaks, lessons, quiz scores and per-subject progress.
- **Languages**: English, Hindi, or Hinglish. Read-aloud (Web Speech) + PDF export.

## Cost: effectively free

Designed to run at **₹0 / $0** for a public site:

| Piece | Choice | Cost |
|---|---|---|
| LLM | **Groq** open-source models (`llama-3.3-70b-versatile`) | Free tier — rate-limits at quota, so **no surprise bill** |
| Auth + DB | **Supabase** (Postgres + Auth + RLS) | Free tier — 500 MB DB, 50k monthly users |
| Hosting | **Vercel** Hobby plan | Free — native Next.js, auto-deploys from GitHub |
| Code | **GitHub** | Free |

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Supabase** for authentication + Postgres, via `@supabase/ssr` (cookie sessions, middleware-refreshed) with Row-Level Security
- **Groq** OpenAI-compatible API (via `fetch`) for lesson/doubt streaming and quiz JSON
- DOMPurify sanitization, per-IP rate limiting, Web Speech TTS, print-to-PDF

## How data is stored

Every user has a row in Supabase's managed `auth.users`. Their data lives in
Postgres tables keyed by `user_id` and locked down with Row-Level Security so each
student only ever sees their own rows:

| Table | Holds |
|---|---|
| `profiles` | name + persona (class, subject, interests, style, character, language) |
| `lessons` | every generated lesson (chapter + HTML) → history & library |
| `quiz_attempts` | score, questions, answers → quizzes & dashboard |
| `doubts` | follow-up Q&A per lesson |

Streaks and progress on the dashboard are computed from these timestamps. The full
schema (tables, indexes, RLS policies, the new-user trigger) is in
[`supabase/schema.sql`](supabase/schema.sql).

## Run locally

1. **Create a Supabase project** at https://supabase.com (free).
2. In the dashboard → **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql).
3. (Optional, for instant testing) **Authentication → Providers → Email**: turn
   *Confirm email* OFF so sign-up logs you straight in.
4. Copy your keys from **Project Settings → API**.

```sh
cp .env.example .env.local      # fill in the four values below
npm install
npm run dev                     # http://localhost:3000
```

Env vars:

| Name | Purpose |
|---|---|
| `GROQ_API_KEY` | **Required.** Server-only Groq key. Get one at https://console.groq.com/keys |
| `GROQ_MODEL` | Optional. Defaults to `llama-3.3-70b-versatile`. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Required.** Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Required.** Supabase anon public key (safe to expose; RLS protects data). |

## Deploy from GitHub to Vercel

1. Push this repo to GitHub.
2. https://vercel.com → **Add New… → Project** → import this repository (auto-detects Next.js).
3. Add the env vars from the table above under **Environment Variables**
   (`GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. In Supabase → **Authentication → URL Configuration**, set the Site URL to your
   `*.vercel.app` domain (and add it to redirect URLs) so email links work.
5. **Deploy.** Every push thereafter auto-deploys.

An optional GitHub Actions deploy workflow lives at `.github/workflows/deploy.yml`
(dormant until you add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets).
CI (typecheck + build) runs on every PR via `.github/workflows/ci.yml`.

## Security notes

- LLM-generated HTML is sanitized with DOMPurify before rendering or read-aloud.
- All AI routes (`/api/lesson`, `/api/quiz`, `/api/doubt`) require an authenticated session and have per-IP rate limiting (`src/lib/rate-limit.ts`). For a hard cluster-wide limit on serverless, back it with Upstash Redis / Vercel KV.
- Row-Level Security on every table guarantees users can only read/write their own data.
- `GROQ_API_KEY` is server-only — never prefix it with `NEXT_PUBLIC_`.

## Project layout

```
supabase/schema.sql              # DB tables + RLS policies + new-user trigger
src/
├── middleware.ts                # refreshes session, guards private routes
├── app/
│   ├── page.tsx                 # public landing
│   ├── login, register          # auth screens
│   ├── auth/                     # server actions + OAuth/confirm callback
│   ├── (app)/                    # authenticated area (shared nav layout)
│   │   ├── dashboard             # streaks, stats, recent lessons
│   │   ├── onboarding, profile   # persona questionnaire
│   │   ├── lesson                # persona lesson + doubt-chat
│   │   ├── quiz                  # MCQ quizzes
│   │   └── library/[id]          # saved lessons
│   └── api/lesson|quiz|doubt     # Groq-backed routes (auth + rate-limited)
├── components/                   # AppNav, AuthForm, PersonaForm, LessonClient, QuizClient, LibraryView
└── lib/
    ├── supabase/                 # browser, server & middleware clients
    ├── db.ts                     # typed DB helpers + dashboard stats
    ├── groq.ts                   # streaming + JSON Groq client (fetch)
    ├── constants.ts, chapters.ts # CBSE data
    ├── prompt.ts                 # lesson/doubt/quiz prompts
    ├── persona.ts, rate-limit.ts, tts.ts
```
