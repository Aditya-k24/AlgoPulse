-- Core schema for AlgoPulse (MVP)
-- Uses auth.users as source of truth for users

create schema if not exists public;

-- profiles: per-user app settings
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_languages text[] default '{"python","java","cpp"}',
  plan text not null default 'baseline', -- baseline | time_crunch
  created_at timestamptz not null default now()
);

-- problems: generated or curated problems
create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  description text not null,
  sample_input text,
  sample_output text,
  constraints text,
  solutions jsonb not null, -- {java, python, cpp}
  methods text[] default '{}',
  created_at timestamptz not null default now()
);

-- attempts: user submissions
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  language text not null,
  verdict text not null check (verdict in ('pass','fail','partial')),
  stdout text,
  stderr text,
  exec_ms integer,
  mem_kb integer,
  created_at timestamptz not null default now()
);

-- recalls: mirrored on server for analytics and sync
create table if not exists public.recalls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  due_at timestamptz not null,
  completed boolean not null default false,
  completed_at timestamptz
);

-- Helpful indexes
create index if not exists idx_problems_category_diff on public.problems(category, difficulty);
create index if not exists idx_attempts_user_problem on public.attempts(user_id, problem_id);
create index if not exists idx_recalls_user_due on public.recalls(user_id, due_at);

-- RLS
alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.recalls enable row level security;
alter table public.problems enable row level security; -- readable to all, writes via edge fn

-- Policies
do $$ begin
  -- profiles: user can manage own profile
  perform 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_self_select';
  if not found then
    create policy profiles_self_select on public.profiles
      for select using (auth.uid() = user_id);
  end if;

  perform 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_self_upsert';
  if not found then
    create policy profiles_self_upsert on public.profiles
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  -- attempts: user can manage own attempts
  perform 1 from pg_policies where schemaname='public' and tablename='attempts' and policyname='attempts_self_rw';
  if not found then
    create policy attempts_self_rw on public.attempts
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  -- recalls: user can manage own recalls
  perform 1 from pg_policies where schemaname='public' and tablename='recalls' and policyname='recalls_self_rw';
  if not found then
    create policy recalls_self_rw on public.recalls
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  -- problems: anyone authenticated can read; writes restricted to service role/edge fn
  perform 1 from pg_policies where schemaname='public' and tablename='problems' and policyname='problems_read_all_auth';
  if not found then
    create policy problems_read_all_auth on public.problems
      for select using (auth.role() = 'authenticated');
  end if;
end $$;


