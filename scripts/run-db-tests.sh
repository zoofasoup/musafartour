#!/usr/bin/env bash
# Runs the database regression suite (tests/db/*.sql) against the linked Supabase project.
# Every test runs inside a transaction that always aborts, so nothing is stored.
# Usage: ./scripts/run-db-tests.sh [tests/db/01_security.sql]
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# A single-file argument may be relative to where the script was started from.
ARG1="${1:-}"
if [ -n "$ARG1" ] && [ -f "$ARG1" ]; then ARG1="$(cd "$(dirname "$ARG1")" && pwd)/$(basename "$ARG1")"; fi
cd "$ROOT" || exit 2

if [ "$#" -ge 1 ]; then
  FILES=("$ARG1")
else
  FILES=(tests/db/*.sql)
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

TOTAL_PASS=0; TOTAL_FAIL=0; TOTAL_SKIP=0; TOTAL_KNOWN=0; ERRORS=0

# Reads the CLI output on stdin and prints the report. Exit 3 when there is no RESULTS report.
PARSER='
import sys, json
raw = sys.stdin.read()
try:
    outer = json.loads(raw[raw.index("{"):raw.rindex("}") + 1])
    msg = outer["error"]["message"]
    inner = json.loads(msg[msg.index("{"):msg.rindex("}") + 1])["message"]
except Exception:
    print(raw.strip()[:2000])
    sys.exit(3)
if "RESULTS" not in inner:
    print(inner.strip()[:2000])
    sys.exit(3)
body = inner.split("RESULTS", 1)[1].split("CONTEXT", 1)[0]
print(body.strip("\n"))
'

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "!! file not found: $f"
    ERRORS=$((ERRORS + 1))
    continue
  fi
  echo "=== $f"
  # Migrations written but not pushed yet (tests/db/pending-migrations.txt) are applied inside the test's own
  # transaction, right after its first BEGIN;, so the tests can exercise them before `supabase db push`.
  RUNFILE="$f"
  if [ -f tests/db/pending-migrations.txt ]; then
    python3 - "$f" "$TMP/run.sql" <<'PY'
import sys
src, dst = sys.argv[1], sys.argv[2]
pending = [l.strip() for l in open("tests/db/pending-migrations.txt") if l.strip() and not l.strip().startswith("#")]
mig = "".join("-- pending migration: %s\n%s\n" % (m, open(m).read()) for m in pending)
lines = open(src).read().split("\n")
i = next(n for n, l in enumerate(lines) if l.strip() == "BEGIN;")
lines.insert(i + 1, mig)
open(dst, "w").write("\n".join(lines))
PY
    RUNFILE="$TMP/run.sql"
  fi
  npx supabase db query --linked -f "$RUNFILE" > "$TMP/out.txt" 2> "$TMP/err.txt"
  python3 -c "$PARSER" < "$TMP/out.txt" > "$TMP/report.txt"
  rc=$?
  cat "$TMP/report.txt"
  if [ "$rc" -ne 0 ]; then
    echo "!! $f ended without a RESULTS report (SQL error or CLI/connection problem)"
    ERRORS=$((ERRORS + 1))
    continue
  fi
  p=$(grep -c '^PASS' "$TMP/report.txt"); fl=$(grep -c '^FAIL' "$TMP/report.txt")
  s=$(grep -c '^SKIP' "$TMP/report.txt"); k=$(grep -c '^KNOWN' "$TMP/report.txt")
  echo "--- $f: PASS=$p FAIL=$fl SKIP=$s KNOWN=$k"
  TOTAL_PASS=$((TOTAL_PASS + p)); TOTAL_FAIL=$((TOTAL_FAIL + fl))
  TOTAL_SKIP=$((TOTAL_SKIP + s)); TOTAL_KNOWN=$((TOTAL_KNOWN + k))
done

echo
echo "TOTAL: PASS=$TOTAL_PASS FAIL=$TOTAL_FAIL SKIP=$TOTAL_SKIP KNOWN=$TOTAL_KNOWN FILE_ERRORS=$ERRORS"
if [ "$TOTAL_FAIL" -gt 0 ] || [ "$ERRORS" -gt 0 ]; then
  echo "RESULT: FAILED"
  exit 1
fi
echo "RESULT: OK"
exit 0
