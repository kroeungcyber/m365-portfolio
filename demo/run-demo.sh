#!/usr/bin/env bash
# M365 Security Lab — Live Demo Script
# Requires the server already running at http://localhost:3000
# Start with:  cd 03-security-lab && npm start
#          OR  cd 03-security-lab && docker compose up -d

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
GREEN="\033[0;32m"
RED="\033[0;31m"
BLUE="\033[0;34m"
RESET="\033[0m"
PASS="${GREEN}✓ PASS${RESET}"
FAIL="${RED}✗ FAIL${RESET}"
INFO="${BLUE}→${RESET}"

pass_count=0
fail_count=0

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   M365 Security Lab — Zero Trust Demo        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo -e "$INFO Target: $BASE_URL"
echo ""

run_check() {
  local label="$1"
  local expected_status="$2"
  local url="$3"

  actual_status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [ "$actual_status" = "$expected_status" ]; then
    echo -e "  $PASS  $label (HTTP $actual_status)"
    ((pass_count++)) || true
  else
    echo -e "  $FAIL  $label (expected HTTP $expected_status, got $actual_status)"
    ((fail_count++)) || true
  fi
}

echo "── Health Check ──────────────────────────────"
run_check "/health returns 200"                       "200" "$BASE_URL/health"

echo ""
echo "── Authentication Enforcement (Zero Trust) ───"
run_check "/api/profile without token → 401"          "401" "$BASE_URL/api/profile"
run_check "/api/documents without token → 401"        "401" "$BASE_URL/api/documents"
run_check "/api/admin/settings without token → 401"   "401" "$BASE_URL/api/admin/settings"

echo ""
echo "── 404 Handling ──────────────────────────────"
run_check "Unknown route → 404"                       "404" "$BASE_URL/unknown-route"

echo ""
echo "══════════════════════════════════════════════"
echo -e "  Results: ${GREEN}${pass_count} passed${RESET}  ${RED}${fail_count} failed${RESET}"
echo ""

if [ "$fail_count" -gt 0 ]; then
  echo -e "  ${RED}Some checks failed.${RESET} Is the server running?"
  echo "  Start with:  cd 03-security-lab && npm start"
  echo "           OR  cd 03-security-lab && docker compose up -d"
  echo ""
  exit 1
fi

echo -e "  ${GREEN}All checks passed.${RESET} Zero Trust is enforced."
echo ""
