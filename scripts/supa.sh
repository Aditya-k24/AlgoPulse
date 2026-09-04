#!/usr/bin/env bash
# Runs the Supabase CLI with SUPABASE_DB_PASSWORD taken from
# SUPABASE_DB_URL_SESSION in .env, so the CLI connects directly instead of
# trying to create a cli_login_postgres role (which this project's DB user
# lacks CREATEROLE for).
#
# The password is decoded from the URL's percent-encoding and never printed.
set -euo pipefail

REPO="${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO"

URL=$(grep '^SUPABASE_DB_URL_SESSION=' .env | cut -d= -f2-)
[ -n "$URL" ] || { echo "SUPABASE_DB_URL_SESSION not found in .env" >&2; exit 1; }

PW=$(node -e '
  const u = process.argv[1];
  const rest = u.slice(u.indexOf("://") + 3);
  const at = rest.lastIndexOf("@");
  const ui = rest.slice(0, at);
  process.stdout.write(decodeURIComponent(ui.slice(ui.indexOf(":") + 1)));
' "$URL")

SUPABASE_DB_PASSWORD="$PW" exec supabase "$@"
