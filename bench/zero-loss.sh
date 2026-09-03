#!/usr/bin/env bash
# Tier D — zero loss under process failure.
#
# This is the tier that validates the architecture rather than a component.
# Throughput numbers are context; "N in, N out, zero duplicates, with the
# relay, the consumer and the worker each killed mid-flight" is the finding.
#
# Enqueues directly into agent_runs + agent_outbox rather than through the
# edge function, deliberately: this tier is about delivery through the
# pipeline, and enqueue_agent_run enforces a 50/day per-user cap that exists
# to bound LLM spend, not to be benchmarked. Tier A covers the HTTP path.
#
#   usage: bench/zero-loss.sh [N] [--chaos]
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

N="${1:-100}"
CHAOS="${2:-}"
DB=$(grep '^SUPABASE_DB_URL_SESSION=' .env | cut -d= -f2-)
TAG="bench-$(date +%s)"

q() { psql "$DB" -X -q -t -A -c "$1"; }

# Sub-second pause without opening a database connection. The first version
# of this script polled in a tight loop, and since each psql invocation is its
# own connection it exhausted the session pooler's 15-client ceiling and
# corrupted its own measurement.
pause() { perl -e 'select(undef,undef,undef,shift)' "$1"; }

# Kills the tsx child AND its npm parent. Matching only "tsx src/x.ts" leaves
# the npm wrapper alive, which then accumulates across restarts — each one
# still holding database connections against the pooler's client limit.
hardkill() {  # $1 = relay|consumer|worker
  pkill -9 -f "tsx src/$1.ts" 2>/dev/null
  pkill -9 -f "npm run $1" 2>/dev/null
  return 0
}

restart() {  # $1 = relay|consumer|worker
  ( cd "$REPO/server" && LLM_MODE=stub nohup npm run "$1" >/tmp/bench-$1.log 2>&1 & )
}

echo "Tier D — zero loss"
echo "  runs: $N   chaos: ${CHAOS:-off}"
echo

USER_ID=$(q "select id from auth.users order by created_at limit 1")
[ -n "$USER_ID" ] || { echo "no users in auth.users"; exit 1; }

echo "Enqueueing $N runs in one statement (run + outbox row commit together)..."
q "
  with new_runs as (
    insert into agent_runs (user_id, kind, category, difficulty, error)
    select '$USER_ID'::uuid, '$TAG', 'Two Pointers', 'Easy', null
      from generate_series(1, $N)
    returning id
  )
  insert into agent_outbox (run_id, payload)
  select id, jsonb_build_object('runId', id::text, 'userId', '$USER_ID', 'kind', 'generate_problem')
    from new_runs;" >/dev/null

# Assert the enqueue itself landed. Silently enqueueing fewer than N would
# make every later assertion measure the wrong thing.
ENQUEUED=$(q "select count(*) from agent_runs where kind='$TAG'")
if [ "$ENQUEUED" != "$N" ]; then
  echo "  ABORT: enqueued $ENQUEUED of $N — refusing to measure a corrupted run"
  q "delete from agent_runs where kind='$TAG'" >/dev/null
  exit 1
fi
echo "  enqueued $ENQUEUED."

if [ "$CHAOS" = "--chaos" ]; then
  echo
  echo "Killing processes mid-flight (SIGKILL, so nothing drains gracefully)..."
  for proc in relay consumer worker; do
    pause 2
    hardkill "$proc"
    echo "  kill -9 $proc"
    pause 1
    restart "$proc"
    echo "  restarted $proc"
  done
fi

echo
echo "Waiting for quiescence..."
for i in $(seq 1 180); do
  read -r PENDING DONE <<<"$(q "
    select (select count(*) from agent_outbox o join agent_runs r on r.id=o.run_id
              where r.kind='$TAG' and o.published_at is null) || ' ' ||
           (select count(*) from agent_runs
              where kind='$TAG' and status in ('succeeded','failed'))")"
  [ "$PENDING" = "0" ] && [ "$DONE" = "$N" ] && break
  pause 2
done

echo
echo "=== Results ==="
q "
  select
    'enqueued            = ' || count(*) from agent_runs where kind='$TAG'
  union all select
    'succeeded           = ' || count(*) from agent_runs where kind='$TAG' and status='succeeded'
  union all select
    'failed              = ' || count(*) from agent_runs where kind='$TAG' and status='failed'
  union all select
    'still queued/running= ' || count(*) from agent_runs where kind='$TAG' and status in ('queued','running')
  union all select
    'outbox unpublished  = ' || count(*) from agent_outbox o join agent_runs r on r.id=o.run_id
      where r.kind='$TAG' and o.published_at is null
  union all select
    'distinct problems   = ' || count(distinct p.id) from problems p join agent_runs r on r.id=p.run_id
      where r.kind='$TAG'
  union all select
    'duplicate problems  = ' || coalesce(sum(c-1),0)::text from (
      select count(*) c from problems p join agent_runs r on r.id=p.run_id
       where r.kind='$TAG' group by p.run_id having count(*) > 1) d;"

SUCCEEDED=$(q "select count(*) from agent_runs where kind='$TAG' and status='succeeded'")
PROBLEMS=$(q "select count(distinct p.id) from problems p join agent_runs r on r.id=p.run_id where r.kind='$TAG'")
UNPUB=$(q "select count(*) from agent_outbox o join agent_runs r on r.id=o.run_id where r.kind='$TAG' and o.published_at is null")

echo
fail=0
[ "$SUCCEEDED" = "$N" ] && echo "  PASS  every run reached succeeded ($SUCCEEDED/$N)" || { echo "  FAIL  $SUCCEEDED/$N succeeded"; fail=1; }
[ "$PROBLEMS"  = "$N" ] && echo "  PASS  exactly one problem per run, no duplicates ($PROBLEMS)" || { echo "  FAIL  $PROBLEMS problems for $N runs"; fail=1; }
[ "$UNPUB"     = "0"  ] && echo "  PASS  outbox fully drained" || { echo "  FAIL  $UNPUB outbox rows unpublished"; fail=1; }

# Leave the database as we found it.
q "delete from problems where run_id in (select id from agent_runs where kind='$TAG')" >/dev/null
q "delete from agent_runs where kind='$TAG'" >/dev/null
echo
echo "cleaned up."
exit $fail
