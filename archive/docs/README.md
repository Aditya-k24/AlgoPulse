# Archived documentation

Superseded by ARCHITECTURE.md, RUNBOOK.md, BENCHMARK.md and docs/adr/.
Kept because they record how the project got here, not how it works now.

Several actively contradict the current system and each other:

- `README_FINAL.md` instructs you to run `add-review-mode-tables.sql`,
  which `FIX_MIGRATION_ERROR.md` documents as broken (it alters a
  `user_problems` table that has never existed in this repo).
- `DEPLOY_OPTIMIZED.md` and `TOKEN_OPTIMIZATION.md` claim
  `max_tokens: 2000` and `temperature: 0.7`, while the function they
  describe shipped with `3000` and `0.8`.
- Schema instructions here predate `supabase/migrations/`, which is now
  the only supported way to change the database.

Do not follow any of it. Start from the root README.
