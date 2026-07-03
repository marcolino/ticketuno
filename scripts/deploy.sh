#!/usr/bin/env bash
#
# Deploy app to Fly.io
# Tags: backend-vX.Y.Z and frontend-vX.Y.Z are created independently,
#       only when changes are detected in the respective directory.
#
# Usage:
#   ./deploy.sh                 → deploy to production
#   ./deploy.sh --staging       → deploy to staging (no version bump, no tag)
#   ./deploy.sh --force         → force production deploy even with no changes
#   ./deploy.sh --no-cache      → disable Docker layer cache

set -e

APP_NAME="ticketuno"
REGIONS="fra"
ORG="personal"
CACHE="true"
FORCE=false
STAGING=false
ENV_FILE="backend/.env"
FLY_CONFIG="fly.toml"
VOLUME_NAME="ticketuno_data"
DEPLOY_NODE_ENV="production"

error_log=$(mktemp)

# Parse flags
for arg in "$@"; do
  case $arg in
    --force) FORCE=true ;;
    --no-cache) CACHE="false" ;;
    --staging) STAGING=true ;;
  esac
done

# ─── Staging overrides ────────────────────────────────────────────────────────

if [ "$STAGING" = true ]; then
  APP_NAME="ticketuno-staging"
  FLY_CONFIG="fly.staging.toml"
  VOLUME_NAME="ticketuno_staging_data"
  DEPLOY_NODE_ENV="staging"
fi

# ─── Helpers ──────────────────────────────────────────────────────────────────

get_last_tag() {
  local component=$1
  git tag --list "${component}-v*" --sort=-version:refname | head -1
}

has_changes() {
  local component=$1
  local last_tag
  last_tag=$(get_last_tag "$component")

  if [ -z "$last_tag" ]; then
    return 0
  fi

  if ! git diff --quiet "${last_tag}" HEAD \
    -- "${component}/" \
    -- "Dockerfile" \
    -- "deploy.sh" \
    ":(exclude)${component}/package-lock.json" \
    ":(exclude)${component}/yarn.lock" \
    ":(exclude)${component}/pnpm-lock.yaml"
  then
    return 0
  fi

  return 1
}

# ─── Pre-flight checks ────────────────────────────────────────────────────────

if [ "$STAGING" = true ]; then
  echo "🚀 Deploying app \"${APP_NAME}\" (STAGING) to Fly.io..."
else
  echo "🚀 Deploying app \"${APP_NAME}\" (PRODUCTION) to Fly.io..."
fi

if [ "$(basename "${PWD}")" != "ticketuno" ]; then
  echo "❌ Current directory is $(basename "${PWD}"), not ticketuno."
  exit 1
fi

if ! command -v fly &> /dev/null; then
  echo "❌ Fly CLI not found. Install it: https://fly.io/docs/hands-on/install-flyctl/"
  exit 2
fi

if ! fly auth whoami &> /dev/null; then
  echo "❌ Not logged in to Fly.io. Run: fly auth login"
  exit 3
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ ${ENV_FILE} not found. Create it from backend/.env.example"
  exit 4
fi

if [ -n "$(git status --porcelain | grep -vE 'package-lock.json|yarn.lock|pnpm-lock.yaml')" ]; then
  echo "❌ Working directory is dirty. Commit or stash changes before deploying."
  exit 5
fi

if ! npm run i18n:status &> /dev/null; then
  echo "❌ Some translations are missing. Complete translations before deploying."
  npm run i18n:status
  exit 6
fi

npm run check-git-leaks > "$error_log" 2>&1
exit_code=$?
if [ $exit_code -ne 0 ]; then
  echo "❌ Some secrets could be leaking from git! View leaks? (y/N): "
  read -r answer
  if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    less "$error_log"
  fi
  rm -f "$error_log"
  exit 6
fi

# Archive temporary files
npm run archive

# ─── TypeScript check ─────────────────────────────────────────────────────────

echo "🔍 Running pre-deploy checks..."
npm run type-check > "$error_log" 2>&1
exit_code=$?
if [ $exit_code -ne 0 ]; then
  echo "❌ TypeScript check (\`npm run type-check\`) failed. View errors? (y/N): "
  read -r answer
  if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    less "$error_log"
  fi
  rm -f "$error_log"
  exit 6
fi

# ─── Change detection (production only) ──────────────────────────────────────

BACKEND_CHANGED=false
FRONTEND_CHANGED=false

if [ "$STAGING" = true ]; then
  # Staging always deploys — no version bookkeeping
  BACKEND_CHANGED=true
  FRONTEND_CHANGED=true
else
  has_changes "backend"  && BACKEND_CHANGED=true
  has_changes "frontend" && FRONTEND_CHANGED=true

  if [ "$BACKEND_CHANGED" = false ] && [ "$FRONTEND_CHANGED" = false ]; then
    if [ "$FORCE" = false ]; then
      echo ""
      echo "⚠️  No changes detected in backend or frontend since last deploy."
      echo "   Last tags:"
      echo "     $(get_last_tag backend  || echo 'backend:  none')"
      echo "     $(get_last_tag frontend || echo 'frontend: none')"
      echo ""
      echo "   Options:"
      echo "     ./deploy.sh --force          re-deploy without bumping versions"
      echo "     git commit --allow-empty ... add a marker commit, then re-run"
      exit 7
    else
      echo "⚠️  No changes detected, but --force was passed. Skipping version bumps."
    fi
  else
    [ "$BACKEND_CHANGED"  = false ] && echo "⚠️  No changes in backend  — version will not be bumped."
    [ "$FRONTEND_CHANGED" = false ] && echo "⚠️  No changes in frontend — version will not be bumped."
  fi
fi

# ─── Read current versions ────────────────────────────────────────────────────

BACKEND_VERSION=$(node  -p "require('./backend/package.json').version")
FRONTEND_VERSION=$(node -p "require('./frontend/package.json').version")

# ─── Ensure app exists ────────────────────────────────────────────────────────

if [ -z "$(fly apps list | grep -E "\s+${APP_NAME}\s+")" ]; then
  echo "📦 Creating new Fly.io app \"${APP_NAME}\"..."
  fly apps create "${APP_NAME}" --org "${ORG}"
else
  echo "✅ App ${APP_NAME} exists on fly.io, skipping creation."
fi

if ! fly volumes list -a "${APP_NAME}" --json | jq -e '.[] | select(.name == "'"${VOLUME_NAME}"'")' > /dev/null; then
  echo "📦 Volume ${VOLUME_NAME} not found. Creating..."
  fly volumes create "${VOLUME_NAME}" --region "${REGIONS}" --size 1 --app "${APP_NAME}"
else
  echo "✅ Volume ${VOLUME_NAME} already exists."
fi

# ─── Secrets ─────────────────────────────────────────────────────────────────

echo "🔐 Importing secrets from ${ENV_FILE}..."
cat "${ENV_FILE}" | fly secrets import --app "${APP_NAME}"
fly secrets set \
  NODE_ENV="${DEPLOY_NODE_ENV}" \
  PORT="8080" \
  --app "${APP_NAME}"

echo "📱 Generating PWA assets..."
npm run pwa:generate

# ─── Version bumps (production only) ─────────────────────────────────────────

if [ "$STAGING" = false ]; then
  if [ "$BACKEND_CHANGED" = true ]; then
    echo "🔢 Bumping backend version..."
    (cd backend && npm version patch --no-git-tag-version)
    BACKEND_VERSION=$(node -p "require('./backend/package.json').version")
    echo "   → backend v${BACKEND_VERSION}"
  fi

  if [ "$FRONTEND_CHANGED" = true ]; then
    echo "🔢 Bumping frontend version..."
    (cd frontend && npm version patch --no-git-tag-version)
    FRONTEND_VERSION=$(node -p "require('./frontend/package.json').version")
    echo "   → frontend v${FRONTEND_VERSION}"
  fi
fi

# ─── Commit + tag + push (production only) ───────────────────────────────────

if [ "$STAGING" = false ]; then
  if [ "$BACKEND_CHANGED" = true ] || [ "$FRONTEND_CHANGED" = true ]; then
    COMMIT_MSG="chore: deploy"
    [ "$BACKEND_CHANGED"  = true ] && COMMIT_MSG="${COMMIT_MSG} backend-v${BACKEND_VERSION}"
    [ "$FRONTEND_CHANGED" = true ] && COMMIT_MSG="${COMMIT_MSG} frontend-v${FRONTEND_VERSION}"

    echo "📝 Committing version bumps..."
    git add backend/package.json frontend/package.json
    git commit -m "${COMMIT_MSG}"

    [ "$BACKEND_CHANGED"  = true ] && git tag -a "backend-v${BACKEND_VERSION}"  -m "Backend v${BACKEND_VERSION}"
    [ "$FRONTEND_CHANGED" = true ] && git tag -a "frontend-v${FRONTEND_VERSION}" -m "Frontend v${FRONTEND_VERSION}"

    echo "⬆️  Pushing to origin..."
    git push origin main --tags
  fi
fi

# set secrets on fly.io
fly secrets set \
  GIT_COMMIT="$(git rev-parse --short HEAD)" \
  GIT_COMMIT_DATE="$(git log -1 --format='%ci' | cut -c1-19)" \
  --app "${APP_NAME}"

# set secrets on github.comn
gh secret set CRON_SECRET --body "`grep CRON_SECRET ./backend/.env | cut -d= -f2`"

# ─── Deploy ───────────────────────────────────────────────────────────────────

echo "🏗️  Building and deploying to ${APP_NAME}"
CACHE_FLAGS=""
if [ "$CACHE" = "" ] || [ "$CACHE" = "false" ]; then
  CACHE_FLAGS="--no-cache --buildkit"
fi
fly deploy --build-arg VITE_MODE="${DEPLOY_NODE_ENV}" --config "${FLY_CONFIG}" --app "${APP_NAME}" --regions "${REGIONS}" ${CACHE_FLAGS} 

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
if [ "$STAGING" = true ]; then
  echo "✅ Staging deploy complete at https://${APP_NAME}.fly.dev"
  echo "   (No version bump. Run ./deploy.sh when ready for production.)"
else
  echo "Versions:"
  echo "  backend:  v${BACKEND_VERSION} (tag: $(get_last_tag backend))"
  echo "  frontend: v${FRONTEND_VERSION} (tag: $(get_last_tag frontend))"
  echo ""
  echo "✅ Production deploy complete at https://ticketuno.fly.dev"
fi

exit 0
