-- meTheTeacher database schema for Supabase (Postgres).
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
-- It is idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- profiles: one row per user, holds the student persona.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  klass       text,                       -- '10' | '12'
  subject     text,
  interests   text[] default '{}',
  comfort     text,
  style       text,
  character   text,
  language    text,
  city        text,
  voice_uri   text,
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Migration for projects created before the city field existed.
alter table public.profiles add column if not exists city text;

-- ---------------------------------------------------------------------------
-- lessons: every generated lesson (history + saved library).
-- ---------------------------------------------------------------------------
create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  klass       text,
  subject     text,
  chapter     text not null,
  language    text,
  style       text,
  character   text,
  html        text not null,
  saved       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists lessons_user_created_idx
  on public.lessons (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- quiz_attempts: one row per completed quiz (dashboard + analytics).
-- ---------------------------------------------------------------------------
create table if not exists public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  klass       text,
  subject     text,
  chapter     text not null,
  total       int not null,
  score       int not null,
  questions   jsonb not null default '[]',  -- [{question, options[], correctIndex, explanation}]
  answers     jsonb not null default '[]',  -- [selectedIndex per question]
  created_at  timestamptz not null default now()
);
create index if not exists quiz_attempts_user_created_idx
  on public.quiz_attempts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- doubts: follow-up Q&A asked on a lesson (doubt-chat history).
-- ---------------------------------------------------------------------------
create table if not exists public.doubts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  lesson_id   uuid references public.lessons (id) on delete set null,
  question    text not null,
  answer      text not null,
  created_at  timestamptz not null default now()
);
create index if not exists doubts_user_lesson_idx
  on public.doubts (user_id, lesson_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security: a user can only touch their own rows.
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.lessons       enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.doubts        enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- generic owner policies for the data tables
do $$
declare t text;
begin
  foreach t in array array['lessons', 'quiz_attempts', 'doubts'] loop
    execute format('drop policy if exists "%1$s_select_own" on public.%1$s;', t);
    execute format('create policy "%1$s_select_own" on public.%1$s for select using (auth.uid() = user_id);', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s;', t);
    execute format('create policy "%1$s_insert_own" on public.%1$s for insert with check (auth.uid() = user_id);', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$s;', t);
    execute format('create policy "%1$s_update_own" on public.%1$s for update using (auth.uid() = user_id);', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s;', t);
    execute format('create policy "%1$s_delete_own" on public.%1$s for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
