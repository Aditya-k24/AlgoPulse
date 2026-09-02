-- Agent orchestration: durable runs, an append-only event log, and a
-- transactional outbox.
--
-- Purely additive. The live schema (complete-schema.sql plus
-- add-review-mode-tables-fixed.sql, both applied by hand before migrations
-- existed) is left untouched; this is the first migration the CLI tracks.

-- ---------------------------------------------------------------------------
-- agent_runs — one row per requested agent run. The id doubles as the
-- Temporal workflowId, which is what makes duplicate delivery harmless.
-- ---------------------------------------------------------------------------
create table if not exists public.agent_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null default 'generate_problem',
  status       text not null default 'queued'
               check (status in ('queued','running','succeeded','failed','cancelled')),
  category     text,
  difficulty   text,
  problem_id   uuid references public.problems(id) on delete set null,
  error        text,
  -- seq allocator for agent_events; bumped under a row lock so the sequence
  -- is gapless and monotonic per run.
  last_seq     bigint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists agent_runs_user_created_idx
  on public.agent_runs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- agent_events — append-only. The primary key IS the replay index: the SSE
-- endpoint's only read is `where run_id = $1 and seq > $2 order by seq`.
-- ---------------------------------------------------------------------------
create table if not exists public.agent_events (
  run_id     uuid   not null references public.agent_runs(id) on delete cascade,
  seq        bigint not null,
  type       text   not null,   -- status | token | reset | done | error
  data       jsonb  not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (run_id, seq)
);

-- ---------------------------------------------------------------------------
-- agent_outbox — the event and the run commit in one transaction. A relay
-- publishes to Kafka and marks the row; see the partial index, which keeps
-- the pending set tiny while the published set grows forever.
-- ---------------------------------------------------------------------------
create table if not exists public.agent_outbox (
  id           bigint generated always as identity primary key,
  run_id       uuid not null references public.agent_runs(id) on delete cascade,
  topic        text not null default 'agent.runs.requested',
  payload      jsonb not null,
  created_at   timestamptz not null default now(),
  published_at timestamptz,
  attempts     int not null default 0
);

create index if not exists agent_outbox_pending_idx
  on public.agent_outbox (id) where published_at is null;

-- ---------------------------------------------------------------------------
-- persist idempotency. An activity can be re-executed after a worker crash,
-- so a crash between the problems insert and its child rows would otherwise
-- create a second problem. A unique constraint is both shorter and correct
-- under concurrency; the alternative is application-level checking that
-- races.
-- ---------------------------------------------------------------------------
alter table public.problems add column if not exists run_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'problems_run_id_key'
  ) then
    alter table public.problems add constraint problems_run_id_key unique (run_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- append_agent_event — allocates seq under a row lock so concurrent emits
-- from one run cannot collide or reorder.
-- ---------------------------------------------------------------------------
create or replace function public.append_agent_event(
  p_run uuid, p_type text, p_data jsonb default '{}'::jsonb
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare s bigint;
begin
  update public.agent_runs
     set last_seq = last_seq + 1, updated_at = now()
   where id = p_run
  returning last_seq into s;

  if s is null then
    raise exception 'unknown run %', p_run using errcode = 'no_data_found';
  end if;

  insert into public.agent_events (run_id, seq, type, data)
  values (p_run, s, p_type, p_data);

  return s;
end $$;

revoke all on function public.append_agent_event(uuid, text, jsonb) from public;

-- ---------------------------------------------------------------------------
-- enqueue_agent_run — the atomic enqueue. One function body is one implicit
-- transaction, so the run and its outbox event commit together or not at all.
--
-- SECURITY DEFINER with user_id taken from auth.uid() internally: a client
-- cannot enqueue as somebody else, and needs no direct grant on agent_outbox.
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_agent_run(
  p_category text default null,
  p_difficulty text default null,
  p_kind text default 'generate_problem'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run   uuid;
  v_user  uuid := auth.uid();
  v_today int;
  -- Bounds spend. Each run is up to 3 LLM calls, so this is the only thing
  -- standing between a retry loop and an overnight bill.
  c_daily_limit constant int := 50;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select count(*) into v_today
    from public.agent_runs
   where user_id = v_user and created_at > now() - interval '1 day';

  if v_today >= c_daily_limit then
    raise exception 'daily run limit of % reached', c_daily_limit
      using errcode = '53400';
  end if;

  insert into public.agent_runs (user_id, kind, category, difficulty)
  values (v_user, p_kind, p_category, p_difficulty)
  returning id into v_run;

  insert into public.agent_outbox (run_id, payload)
  values (v_run, jsonb_build_object(
    'runId',      v_run,
    'userId',     v_user,
    'kind',       p_kind,
    'category',   p_category,
    'difficulty', p_difficulty
  ));

  return v_run;
end $$;

revoke all on function public.enqueue_agent_run(text, text, text) from public;
grant execute on function public.enqueue_agent_run(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Wake the relay. STATEMENT level, not ROW: a batch insert fires one
-- notification rather than one per row. The payload is empty on purpose --
-- it is a pure wakeup, which sidesteps the 8000-byte NOTIFY limit entirely.
-- ---------------------------------------------------------------------------
create or replace function public.agent_outbox_notify() returns trigger
language plpgsql as $$
begin
  perform pg_notify('agent_outbox', '');
  return null;
end $$;

drop trigger if exists agent_outbox_notify_t on public.agent_outbox;
create trigger agent_outbox_notify_t
  after insert on public.agent_outbox
  for each statement execute function public.agent_outbox_notify();

-- ---------------------------------------------------------------------------
-- RLS. Users read their own runs and events and nothing else. agent_outbox
-- gets RLS enabled and NO policy at all, so it is deny-by-default for every
-- client role; only the service role (which bypasses RLS) touches it.
-- ---------------------------------------------------------------------------
alter table public.agent_runs   enable row level security;
alter table public.agent_events enable row level security;
alter table public.agent_outbox enable row level security;

drop policy if exists agent_runs_select_own on public.agent_runs;
create policy agent_runs_select_own on public.agent_runs
  for select using (auth.uid() = user_id);

drop policy if exists agent_events_select_own on public.agent_events;
create policy agent_events_select_own on public.agent_events
  for select using (
    exists (
      select 1 from public.agent_runs r
       where r.id = agent_events.run_id and r.user_id = auth.uid()
    )
  );

comment on table public.agent_runs   is 'One durable agent run; id is the Temporal workflowId.';
comment on table public.agent_events is 'Append-only run event log; (run_id, seq) is the SSE replay cursor.';
comment on table public.agent_outbox is 'Transactional outbox. Service-role only: RLS on, no policies.';
