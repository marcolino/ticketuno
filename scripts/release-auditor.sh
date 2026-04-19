#!/usr/bin/env bash
# ===============================================================
# RELEASE AUDITOR v2
# Ubuntu + npm + Vite + Git
#
# Prerequisite:
#  $ git clone --mirror yourrepo audit.git
#  $ cd audit.git
#
# Produces:
# - PASS / FAIL / WARN checklist
# - Automated checks
# - Uncertain checks needing manual review
# - Suggestions to verify manually
# ===============================================================

set -u

REPORT="release_audit_report.txt"
TMP="$(mktemp)"

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

echo "" > "$REPORT"

# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------

line() {
  printf '%*s\n' "${COLUMNS:-70}" '' | tr ' ' '-'
}

pass() {
  echo "[PASS] $1" | tee -a "$REPORT"
  PASS_COUNT=$((PASS_COUNT+1))
}

fail() {
  echo "[FAIL] $1" | tee -a "$REPORT"
  FAIL_COUNT=$((FAIL_COUNT+1))
}

warn() {
  echo "[WARN] $1" | tee -a "$REPORT"
  WARN_COUNT=$((WARN_COUNT+1))
}

section() {
  echo "" | tee -a "$REPORT"
  line | tee -a "$REPORT"
  echo "$1" | tee -a "$REPORT"
  line | tee -a "$REPORT"
}

exists_cmd() {
  command -v "$1" >/dev/null 2>&1
}

# ---------------------------------------------------------------
# Start
# ---------------------------------------------------------------

section "RELEASE SECURITY AUDIT"

date | tee -a "$REPORT"

if [ ! -d ".git" ]; then
  fail "Not inside a git repository"
  exit 1
else
  pass "Git repository detected"
fi

if [ -f package.json ]; then
  pass "package.json found"
else
  warn "package.json missing"
fi

# ---------------------------------------------------------------
# 1. .env tracked now
# ---------------------------------------------------------------

section "1. ENV FILES"

TRACKED_ENV=$(git ls-files | grep -E '(^|/)\.env($|\.)' || true)

if [ -z "$TRACKED_ENV" ]; then
  pass ".env files are not currently tracked"
else
  fail ".env files currently tracked:"
  echo "$TRACKED_ENV" | tee -a "$REPORT"
fi

# ---------------------------------------------------------------
# 2. .env in history
# ---------------------------------------------------------------

HIST_ENV=$(git log --all --name-only --pretty=format: \
| sort -u | grep -E '(^|/)\.env($|\.)' || true)

if [ -z "$HIST_ENV" ]; then
  pass ".env files not found in git history"
else
  fail ".env files found in git history:"
  echo "$HIST_ENV" | tee -a "$REPORT"
  echo "Suggestion: use git-filter-repo and rotate secrets" | tee -a "$REPORT"
fi

# ---------------------------------------------------------------
# 3. Secret pattern scan current files
# ---------------------------------------------------------------

section "2. SECRET PATTERNS IN CURRENT FILES"

grep -RniE \
'(sk_live_|SECRET_KEY|JWT_SECRET|password=|smtp_pass|PRIVATE KEY|api[_-]?key)' \
. \
--exclude-dir=node_modules \
--exclude-dir=.git \
--exclude-dir=dist \
--exclude-dir=tmp \
> "$TMP" || true

if [ -s "$TMP" ]; then
  fail "Potential secrets found in files"
  cat "$TMP" | tee -a "$REPORT"
else
  pass "No obvious secret patterns found in current files"
fi

# ---------------------------------------------------------------
# 4. Secret pattern scan history
# ---------------------------------------------------------------

section "3. SECRET PATTERNS IN GIT HISTORY"

git log -p --all | grep -iE \
'(sk_live_|jwt_secret|password=|smtp_pass|private key)' > "$TMP" || true

if [ -s "$TMP" ]; then
  fail "Potential secrets found in git history"
else
  pass "No obvious secret patterns found in history"
fi

# ---------------------------------------------------------------
# 5. npm audit
# ---------------------------------------------------------------

section "4. NPM DEPENDENCIES"

if exists_cmd npm; then
  npm audit --audit-level=high > "$TMP" 2>&1 || true

  if grep -qi "found 0 vulnerabilities" "$TMP"; then
    pass "npm audit reports no vulnerabilities"
  else
    warn "npm audit reported issues (review manually)"
    cat "$TMP" >> "$REPORT"
  fi
else
  warn "npm not installed"
fi

# ---------------------------------------------------------------
# 6. Build
# ---------------------------------------------------------------

section "5. PRODUCTION BUILD"

if exists_cmd npm; then
  npm run build > "$TMP" 2>&1

  if [ $? -eq 0 ]; then
    pass "Production build successful"
  else
    fail "Build failed"
    cat "$TMP" >> "$REPORT"
  fi
else
  warn "npm unavailable; build skipped"
fi

# ---------------------------------------------------------------
# 7. Dist bundle scan
# ---------------------------------------------------------------

section "6. DIST BUNDLE CHECK"

if [ -d dist ]; then
  grep -RniE \
  '(sk_live_|SECRET_KEY|JWT_SECRET|password=|smtp_pass|api[_-]?key)' \
  dist > "$TMP" || true

  if [ -s "$TMP" ]; then
    fail "Potential secrets found in built frontend bundle"
    cat "$TMP" | tee -a "$REPORT"
  else
    pass "No obvious secrets found in dist bundle"
  fi
else
  warn "dist folder missing"
fi

# ---------------------------------------------------------------
# 8. Vite public env review
# ---------------------------------------------------------------

section "7. VITE PUBLIC VARIABLES"

if [ -d src ]; then
  grep -Rni "import.meta.env" src > "$TMP" || true

  if [ -s "$TMP" ]; then
    warn "Vite env variables used in frontend (review each VITE_* variable)"
    cat "$TMP" | tee -a "$REPORT"
  else
    pass "No import.meta.env usage found"
  fi
else
  warn "src folder missing"
fi

# ---------------------------------------------------------------
# 9. Source maps
# ---------------------------------------------------------------

section "8. SOURCE MAPS"

MAPS=$(find dist -type f -name "*.map" 2>/dev/null || true)

if [ -z "$MAPS" ]; then
  pass "No source maps found in dist"
else
  warn "Source maps present in dist"
  echo "$MAPS" | tee -a "$REPORT"
fi

# ---------------------------------------------------------------
# 10. Express security heuristics
# ---------------------------------------------------------------

section "9. BACKEND HEURISTICS"

CORS=$(grep -Rni "cors()" . \
--exclude-dir=node_modules \
--exclude-dir=.git || true)

if [ -n "$CORS" ]; then
  warn "Possible unrestricted CORS usage"
  echo "$CORS" | tee -a "$REPORT"
else
  pass "No obvious unrestricted cors() found"
fi

ADMIN=$(grep -RniE '/admin|admin/' . \
--exclude-dir=node_modules \
--exclude-dir=.git || true)

if [ -n "$ADMIN" ]; then
  warn "Admin routes/files detected (verify auth manually)"
  echo "$ADMIN" | tee -a "$REPORT"
else
  pass "No obvious admin routes found"
fi

# ---------------------------------------------------------------
# MANUAL REVIEW
# ---------------------------------------------------------------

section "10. MANUAL VERIFICATION CHECKLIST"

cat <<EOF | tee -a "$REPORT"

[ ] Verify seat booking race conditions are prevented
    - Two users cannot buy same seat simultaneously

[ ] Verify payment is confirmed server-side before booking finalization

[ ] Verify admin routes require admin role, not only login

[ ] Verify JWT/session tokens expire and are revocable

[ ] Verify rate limiting on login / booking / payment endpoints

[ ] Verify logs do not contain PII or payment data

[ ] Verify staging / dev URLs are not publicly accessible

[ ] Verify DB backups / storage buckets are private

[ ] Verify QR tickets cannot be reused or forged

[ ] Verify CSP / HTTPS / secure cookies enabled

[ ] Verify public VITE_* keys are domain restricted

[ ] Verify no hidden internal endpoints in frontend bundle

EOF

# ---------------------------------------------------------------
# Summary
# ---------------------------------------------------------------

section "SUMMARY"

echo "PASS : $PASS_COUNT" | tee -a "$REPORT"
echo "FAIL : $FAIL_COUNT" | tee -a "$REPORT"
echo "WARN : $WARN_COUNT" | tee -a "$REPORT"

echo "" | tee -a "$REPORT"
echo "Full report written to: $REPORT" | tee -a "$REPORT"

rm -f "$TMP"
