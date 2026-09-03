#!/usr/bin/env bash
# End-to-end smoke test of the whole pipeline, against live Supabase.
#
# Run this before presenting. It exercises every hop — edge function, outbox,
# NOTIFY, relay, Kafka, consumer, Temporal, worker, event log, SSE — and
# asserts on the result rather than printing something for a human to squint
# at.
#
# Requires: docker compose up -d, plus relay/consumer/worker running.
#   usage: scripts/e2e.sh [email] [password]
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

EMAIL="${1:-test@algopulse.com}"
PASSWORD="${2:-test123456}"

SUPA_URL=$(grep '^EXPO_PUBLIC_SUPABASE_URL=' .env | cut -d= -f2-)
ANON=$(grep '^EXPO_PUBLIC_SUPABASE_ANON_KEY=' .env | cut -d= -f2-)
DB_URL=$(grep '^SUPABASE_DB_URL_SESSION=' .env | cut -d= -f2-)

pass=0; fail=0
ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail+1)); }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

step "1. Authenticate"
TOKEN=$(curl -s --max-time 20 -X POST "$SUPA_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).access_token||"")}catch{}})')
[ -n "$TOKEN" ] && ok "signed in as $EMAIL" || { bad "could not sign in as $EMAIL"; exit 1; }

step "2. Reject unauthenticated callers"
for probe in "no token::" "bad token::Bearer not.a.jwt"; do
  label="${probe%%::*}"; hdr="${probe##*::}"
  if [ -n "$hdr" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$SUPA_URL/functions/v1/agent-run" -H "Authorization: $hdr")
  else
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$SUPA_URL/functions/v1/agent-run")
  fi
  [ "$code" = "401" ] && ok "$label rejected with 401" || bad "$label returned $code, expected 401"
done

step "3. Enqueue a run"
T0=$(date +%s)
RUN=$(curl -s --max-time 30 -X POST "$SUPA_URL/functions/v1/agent-run" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"category":"Two Pointers","difficulty":"Easy"}' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).runId||"")}catch{}})')
ENQ=$(( $(date +%s) - T0 ))
[ -n "$RUN" ] && ok "runId returned in ${ENQ}s: $RUN" || { bad "no runId returned"; exit 1; }
[ "$ENQ" -le 5 ] && ok "enqueue returned promptly (${ENQ}s)" || bad "enqueue took ${ENQ}s — it should not wait on the agent"

step "4. Stream it to completion"
FRAMES=$(mktemp)
curl -sN --max-time 120 "$SUPA_URL/functions/v1/agent-stream?runId=$RUN" \
  -H "Authorization: Bearer $TOKEN" > "$FRAMES"
STREAM=$(( $(date +%s) - T0 ))

grep -q '^event: done' "$FRAMES" && ok "received terminal done event" || bad "no done event — stream ended without completing"
TOKENS=$(grep -c '^event: token' "$FRAMES")
[ "$TOKENS" -gt 0 ] && ok "streamed $TOKENS token events" || bad "no token events streamed"
[ "$STREAM" -lt 100 ] && ok "stream closed on done after ${STREAM}s, not at the 100s cap" \
                      || bad "stream ran to the retirement cap — it did not close on done"

step "5. Resume from Last-Event-ID"
RESUMED=$(curl -sN --max-time 60 "$SUPA_URL/functions/v1/agent-stream?runId=$RUN" \
  -H "Authorization: Bearer $TOKEN" -H "Last-Event-ID: 3" | grep -m1 '^id:' | awk '{print $2}')
[ "$RESUMED" = "4" ] && ok "resume at Last-Event-ID 3 replayed from seq 4" \
                     || bad "resume replayed from seq $RESUMED, expected 4"

step "6. Assert what landed in the database"
read -r STATUS EVENTS MAXSEQ PROBLEMS APPROACHES REFS <<<"$(psql "$DB_URL" -X -q -t -A -F' ' -c "
  select r.status,
         (select count(*) from agent_events e where e.run_id = r.id),
         (select coalesce(max(seq),0) from agent_events e where e.run_id = r.id),
         (select count(*) from problems p where p.run_id = r.id),
         (select count(*) from problem_explanations x
            join problems p on p.id = x.problem_id where p.run_id = r.id),
         (select count(*) from problem_references f
            join problems p on p.id = f.problem_id where p.run_id = r.id)
    from agent_runs r where r.id = '$RUN';")"

[ "$STATUS" = "succeeded" ] && ok "run status is succeeded" || bad "run status is $STATUS"
[ "$EVENTS" = "$MAXSEQ" ]   && ok "event sequence is gapless ($EVENTS events, max seq $MAXSEQ)" \
                            || bad "sequence has gaps: $EVENTS events but max seq $MAXSEQ"
[ "$PROBLEMS" = "1" ]       && ok "exactly one problem row for this run" || bad "$PROBLEMS problem rows, expected 1"
[ "$APPROACHES" -ge 2 ]     && ok "$APPROACHES approaches persisted" || bad "$APPROACHES approaches, expected at least 2"
[ "$REFS" -ge 2 ]           && ok "$REFS references persisted" || bad "$REFS references, expected at least 2"

step "7. Confirm the outbox drained"
PENDING=$(psql "$DB_URL" -X -q -t -A -c "select count(*) from agent_outbox where run_id = '$RUN' and published_at is null")
[ "$PENDING" = "0" ] && ok "outbox row published" || bad "$PENDING outbox rows still pending — is the relay running?"

rm -f "$FRAMES"
printf '\n\033[1m%d passed, %d failed\033[0m\n' "$pass" "$fail"
[ "$fail" -eq 0 ] || exit 1
