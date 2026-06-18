#!/usr/bin/env bash
# gc-check.sh — Architectural invariants for the .pi/ kit
# Slim version: 4 extensions, no SDK subdir, smaller surface.
#
# Returns exit 0 if all pass, 1 otherwise.
# Invoked from `/gc` workflow. Run manually: bash .pi/scripts/gc-check.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ERRORS=0

fail() { echo "  FAIL: $1"; ERRORS=$((ERRORS + 1)); }
pass() { echo "  PASS: $1"; }

# --- 1. Extension isolation: no cross-extension imports ---
echo "[Check 1/4] Extension isolation..."
EXT_DIR="$ROOT/.pi/extensions"
EXTS=()
for f in "$EXT_DIR"/*.ts; do
  [ -f "$f" ] && EXTS+=("$(basename "$f" .ts)")
done

for ext in "${EXTS[@]}"; do
  for other in "${EXTS[@]}"; do
    [ "$ext" = "$other" ] && continue
    # Allow subdir imports (./foo/bar) but flag direct cross-extension
    if grep -qE "from ['\"]\./$other['\"]" "$EXT_DIR/$ext.ts" 2>/dev/null; then
      fail "$ext.ts imports from $other.ts — extensions must be independent"
    fi
  done
done
pass "No cross-extension imports"

# --- 2. File size limits ---
echo "[Check 2/4] File size limits..."
MAX_EXT=400
for f in "$EXT_DIR"/*.ts; do
  [ ! -f "$f" ] && continue
  lines=$(wc -l <"$f")
  name=$(basename "$f")
  if [ "$lines" -gt "$MAX_EXT" ]; then
    fail "$name exceeds ${MAX_EXT} lines ($lines)"
  fi
done
pass "All extensions within size limits"

# --- 3. No stale .opencode/ references in active skills ---
echo "[Check 3/4] No stale .opencode/ references in active skills..."
ACTIVE_SKILLS=$(find "$ROOT/.pi/skills" -maxdepth 2 -name "SKILL.md" -not -path "*/_tier-3-archive/*" 2>/dev/null || true)
STALE=""
for f in $ACTIVE_SKILLS; do
  matches=$(grep -nF ".opencode/" "$f" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    STALE+="$f: $matches\n"
  fi
done
if [ -n "$STALE" ]; then
  fail "Stale .opencode/ paths in active skills:"
  echo -e "$STALE" | head -10
fi
pass "No stale .opencode/ paths in active skills"

# --- 4. Required files present ---
echo "[Check 4/4] Required files present..."
REQUIRED=(
  "$ROOT/.pi/AGENTS.md"
  "$ROOT/.pi/README.md"
  "$ROOT/.pi/VERSION"
  "$ROOT/.pi/settings.json"
)
for f in "${REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    fail "Required file missing: $f"
  fi
done
pass "All required files present"

echo ""
echo "---"
if [ "$ERRORS" -eq 0 ]; then
  echo "[OK] All structural checks passed."
  exit 0
else
  echo "[FAIL] $ERRORS check(s) failed."
  exit 1
fi
