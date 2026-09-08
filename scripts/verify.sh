#!/usr/bin/env bash
# scripts/verify.sh — the repo's verification harness (claude-setup
# docs/repo-standards.md § "Every repository verifies itself with one command").
#
# One line when everything passes, one failure block when it doesn't:
#
#   TYPES ok | LINT ok | TEST 329/329 ok | STRINGS ok | BUILD ok
#
# Stages run in order and the FIRST failure stops the run, so a red run names
# exactly one thing. Every stage's stdout+stderr goes to .verify/<stage>.log
# (gitignored, and the whole directory is wiped at the start of every run — so a
# missing log is proof that stage never ran).
#
#   stage    exit  command
#   TYPES     10   npm run typecheck
#   LINT      20   npm run lint, then npx prettier --check .
#   TEST      30   npm run test              (segment carries the vitest count)
#   STRINGS   40   node tools/strings-check.ts  ("STRINGS skip" when tools/ lacks it)
#   BUILD     50   npx vite build
#
# usage: scripts/verify.sh

set -uo pipefail

readonly USAGE='usage: scripts/verify.sh'

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)" || exit 2
cd -- "$repo_root" || exit 2

for arg in "$@"; do
  case "$arg" in
    -h | --help)
      printf '%s\n' "$USAGE"
      exit 0
      ;;
    *)
      printf 'verify: unknown argument: %s\n%s\n' "$arg" "$USAGE" >&2
      exit 2
      ;;
  esac
done

log_dir="$repo_root/.verify"
rm -rf -- "$log_dir"
mkdir -p -- "$log_dir" || exit 2

# The logs are read by tail, grep and humans — never by a terminal.
export NO_COLOR=1 FORCE_COLOR=0

# The one-line summary, built a segment at a time as stages pass.
segments=()

# fail <STAGE> <exit-code> <log> — the only thing a red run prints: what broke,
# the tail of its log, and where the rest of it is.
fail() {
  local stage=$1 code=$2 log=$3
  printf 'FAIL %s (exit %s)\n\n' "$stage" "$code"
  if [ -s "$log" ]; then
    tail -n 20 "$log"
  else
    printf '(no output)\n'
  fi
  printf '\nlog: %s\n' "$log"
  exit "$code"
}

# run <STAGE> <exit-code> <log> <command…> — appends, so one stage can chain
# several commands (LINT does) into a single log and a single exit code.
run() {
  local stage=$1 code=$2 log=$3
  shift 3
  "$@" >>"$log" 2>&1 || fail "$stage" "$code" "$log"
}

# Vitest's summary line reads `Tests  329 passed (329)`, with `N failed |` and
# `N skipped |` in front when relevant. Turn it into `329/329`; print nothing if
# the reporter ever changes shape, so the segment degrades to a plain `TEST ok`
# rather than lying about a count.
test_counts() {
  local line passed total
  line=$(grep -E '^[[:space:]]*Tests[[:space:]]' "$1" | tail -n 1)
  passed=$(printf '%s' "$line" | sed -nE 's/.*[^0-9]([0-9]+) passed.*/\1/p')
  total=$(printf '%s' "$line" | sed -nE 's/.*\(([0-9]+)\).*/\1/p')
  if [ -n "$passed" ] && [ -n "$total" ]; then
    printf '%s/%s' "$passed" "$total"
  fi
}

run TYPES 10 "$log_dir/types.log" npm run typecheck
segments+=('TYPES ok')

# Two commands, one gate: eslint owns correctness, prettier owns formatting, and
# either one failing is a lint failure (exit 20).
run LINT 20 "$log_dir/lint.log" npm run lint
run LINT 20 "$log_dir/lint.log" npx prettier --check .
segments+=('LINT ok')

run TEST 30 "$log_dir/test.log" npm run test
counts=$(test_counts "$log_dir/test.log")
segments+=("TEST${counts:+ $counts} ok")

# The strings pack is the app's only source of user-visible copy — a missing key
# is a blank line on screen, not an English word — so completeness is a gate,
# not a warning (tools/strings-check.ts).
if [ -f "$repo_root/tools/strings-check.ts" ]; then
  run STRINGS 40 "$log_dir/strings.log" node tools/strings-check.ts
  segments+=('STRINGS ok')
else
  segments+=('STRINGS skip')
fi

# vite build directly, not `npm run build`: that would re-run tsc and
# strings-check, so a strings failure would resurface as FAIL BUILD long after
# STRINGS had passed.
run BUILD 50 "$log_dir/build.log" npx vite build
segments+=('BUILD ok')

line=''
for segment in "${segments[@]}"; do
  line="${line:+$line | }$segment"
done
printf '%s\n' "$line"
