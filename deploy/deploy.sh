#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  APH deploy — one host, several host names, one command per environment.
#
#    ./deploy/deploy.sh --env staging            # build a new release, restart :3000
#    ./deploy/deploy.sh --env uat                # build a new release, restart :3010
#    ./deploy/deploy.sh --env www --slot green   # blue/green on www (zero downtime)
#    ./deploy/deploy.sh --env staging --rollback # back to the previous release (no build)
#    ./deploy/deploy.sh --env staging --dry-run  # show every command, change nothing
#
#  How it works
#    1. git archive <ref> → /srv/aph/releases/<env>-<utc>-<sha>
#    2. npm run build inside that immutable directory (node_modules is shared)
#    3. point /srv/aph/current-<port> at it, restart aph-nuxt@<port>
#    4. health-check /api/health; on failure put the old symlink back automatically
#    5. keep the last N releases (paths.keepReleases in deploy/environments.json)
#
#  www uses two ports (blue 3020 / green 3030) so a deploy never drops a request:
#  the idle slot is built and health-checked first, then the edge upstream include is
#  flipped and nginx reloaded. Rolling back = `--rollback` (flips it straight back).
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

ENV_NAME=""; REF="origin/main"; BUILD=1; MIGRATE=0; DRY=0; ROLLBACK=0; SLOT=""
KEEP=""

usage() { sed -n '2,30p' "$0" | sed 's/^#//'; exit "${1:-0}"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_NAME="${2:-}"; shift 2 ;;
    --ref) REF="${2:-}"; shift 2 ;;
    --slot) SLOT="${2:-}"; shift 2 ;;
    --keep) KEEP="${2:-}"; shift 2 ;;
    --no-build) BUILD=0; shift ;;
    --migrate) MIGRATE=1; shift ;;
    --rollback) ROLLBACK=1; shift ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) usage 0 ;;
    *) echo "✖ unknown option: $1"; usage 1 ;;
  esac
done
[[ -z "$ENV_NAME" ]] && { echo "✖ --env is required (staging | uat | www)"; usage 1; }

# ── sudo handling: run as root, or as the deploy user with NOPASSWD rules ──
SUDO=""
[[ "$(id -u)" -ne 0 ]] && SUDO="sudo"

run() {
  if [[ $DRY -eq 1 ]]; then echo "  + $*"; else "$@"; fi
}

say()  { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }

# Restart hook. Default = systemd template unit `aph-nuxt@<port>`.
# Override for pm2/docker/supervisor or for local testing:
#   DEPLOY_RESTART_CMD='pm2 restart aph-@PORT@'
#   DEPLOY_RESTART_CMD='(PORT=@PORT@ node /srv/aph/current-@PORT@/.output/server/index.mjs &)'
restart_unit() {
  if [[ -n "${DEPLOY_RESTART_CMD:-}" ]]; then
    local cmd="${DEPLOY_RESTART_CMD//@PORT@/$TARGET_PORT}"
    if [[ $DRY -eq 1 ]]; then echo "  + $cmd"; else eval "$cmd"; fi
  else
    run "$SUDO" systemctl restart "aph-nuxt@${TARGET_PORT}"
  fi
}
ok()   { printf '  \033[32m✔\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m⚠\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✖ %s\033[0m\n' "$*"; exit 1; }

# ── 1. read the environment map (single source of truth) ──────────────────
CFG_FILE="${CFG_FILE:-$(cd "$(dirname "$0")/.." && pwd)/deploy/environments.json}"
[[ -f "$CFG_FILE" ]] || die "config not found: $CFG_FILE"

eval "$(node - "$CFG_FILE" "$ENV_NAME" <<'NODE'
const [file, name] = process.argv.slice(2)
const m = require(require('node:path').resolve(file))
const e = m.environments.find((x) => x.name === name)
if (!e) { console.error(`✖ unknown environment "${name}" — options: ${m.environments.map((x) => x.name).join(', ')}`); process.exit(1) }
const q = (v) => `'${String(v).replace(/'/g, `'\\''`)}'`
console.log(`ENV_HOST=${q(e.host)}`)
console.log(`ENV_PORT=${q(e.port)}`)
console.log(`ENV_PORT_ALT=${q(e.portAlt || '')}`)
console.log(`ENV_DB=${q(e.db)}`)
console.log(`ENV_DB_SOURCE=${q(e.syncSource || '')}`)
console.log(`ENV_MODE=${q(e.mode)}`)
console.log(`REPO_DIR=${q(m.paths.repo)}`)
console.log(`RELEASES_DIR=${q(m.paths.releases)}`)
console.log(`SHARED_DIR=${q(m.paths.shared)}`)
console.log(`ENV_DIR=${q(m.paths.env)}`)
console.log(`DEFAULT_KEEP=${q(m.paths.keepReleases || 5)}`)
NODE
)" || die "cannot read $CFG_FILE"

KEEP="${KEEP:-$DEFAULT_KEEP}"
IS_PROD=0; [[ "$ENV_MODE" == "production" ]] && IS_PROD=1

# www: blue = port, green = portAlt (or --slot decides which one we deploy into)
UPSTREAM_FILE="${EDGE_UPSTREAM_FILE:-/etc/nginx/aph-upstream-www.conf}"
if [[ $IS_PROD -eq 1 ]]; then
  [[ -n "$ENV_PORT_ALT" ]] || die "www needs portAlt (green slot) in deploy/environments.json"

  # which slot is nginx sending traffic to right now?
  ACTIVE_PORT="$(grep -oE '127\.0\.0\.1:[0-9]+' "$UPSTREAM_FILE" 2>/dev/null | head -1 | cut -d: -f2 || true)"
  ACTIVE_SLOT=""; ACTIVE_PORT="${ACTIVE_PORT:-}"
  [[ "$ACTIVE_PORT" == "$ENV_PORT" ]] && ACTIVE_SLOT=blue
  [[ "$ACTIVE_PORT" == "$ENV_PORT_ALT" ]] && ACTIVE_SLOT=green

  case "${SLOT:-}" in
    blue)  TARGET_PORT="$ENV_PORT";      WANT_SLOT=blue ;;
    green) TARGET_PORT="$ENV_PORT_ALT";  WANT_SLOT=green ;;
    "")
      # auto: always deploy into the idle slot
      if [[ "$ACTIVE_SLOT" == "blue" ]]; then TARGET_PORT="$ENV_PORT_ALT"; WANT_SLOT=green
      else TARGET_PORT="$ENV_PORT"; WANT_SLOT=blue; fi ;;
    *) die "--slot must be blue or green" ;;
  esac

  # never rebuild the slot that is currently serving live traffic: that is downtime
  if [[ "$WANT_SLOT" == "$ACTIVE_SLOT" && $ROLLBACK -eq 0 ]]; then
    OTHER=$([[ "$WANT_SLOT" == "blue" ]] && echo green || echo blue)
    die "slot ${WANT_SLOT} is live right now — deploy into the idle slot instead: --slot ${OTHER}"
  fi
  SLOT="$WANT_SLOT"
else
  TARGET_PORT="$ENV_PORT"
fi

CURRENT_LINK="$REPO_DIR/current-$TARGET_PORT"

say "deploy ${ENV_NAME}  host=${ENV_HOST}  port=${TARGET_PORT}  db=${ENV_DB}${SLOT:+  slot=$SLOT}"
[[ $DRY -eq 1 ]] && warn "dry run — nothing will be changed"

# ── 2. pick the release to serve ──────────────────────────────────────────
if [[ $ROLLBACK -eq 1 ]]; then
  PREV="$(ls -1dt "$RELEASES_DIR"/"${ENV_NAME}"-* 2>/dev/null | sed -n 2p || true)"
  [[ -n "$PREV" ]] || die "no previous release found in $RELEASES_DIR for ${ENV_NAME}"
  NEW_REL="$PREV"
  say "rollback ${ENV_NAME} → $(basename "$PREV")"
else
  command -v git >/dev/null || die "git not found"
  SHA="$(git -C "$REPO_DIR" rev-parse --short=12 "$REF" 2>/dev/null || true)"
  [[ -n "$SHA" ]] || { run git -C "$REPO_DIR" fetch --all --quiet; SHA="$(git -C "$REPO_DIR" rev-parse --short=12 "$REF")"; }
  STAMP="$(date -u +%Y%m%d-%H%M%S)"
  NEW_REL="$RELEASES_DIR/${ENV_NAME}-${STAMP}-${SHA}"

  say "release $(basename "$NEW_REL")  (ref ${REF} @ ${SHA})"
  run mkdir -p "$NEW_REL"
  if [[ $DRY -eq 0 ]]; then
    git -C "$REPO_DIR" archive "$REF" | tar -x -C "$NEW_REL"
    ok "source extracted ($(du -sh "$NEW_REL" | cut -f1))"
  fi
  # node_modules is shared (one install, all releases) — keeps each release small
  run ln -sfn "$SHARED_DIR/node_modules" "$NEW_REL/node_modules"
fi

# ── 3. build (public runtime config is injected at runtime, so one build fits all) ──
if [[ $BUILD -eq 1 && $ROLLBACK -eq 0 ]]; then
  say "building"
  [[ -f "$ENV_DIR/aph-common.env" ]] || warn "no $ENV_DIR/aph-common.env — building without it"
  if [[ $DRY -eq 1 ]]; then
    echo "  + (cd $NEW_REL && set -a && . $ENV_DIR/aph-common.env && set +a && NODE_ENV=production npm run build)"
  else
    ( cd "$NEW_REL" \
      && { [[ -f "$ENV_DIR/aph-common.env" ]] && { set -a; . "$ENV_DIR/aph-common.env"; set +a; }; } \
      && NODE_ENV=production npm run build >/tmp/aph-build-$$.log 2>&1 ) || { tail -30 /tmp/aph-build-$$.log; die "build failed (log: /tmp/aph-build-$$.log)"; }
    ok "build complete ($(du -sh "$NEW_REL/.output" | cut -f1))"
  fi
fi

# ── 4. migrations (opt-in: never run them by accident on the wrong DB) ────
if [[ $MIGRATE -eq 1 ]]; then
  say "database migrations → ${ENV_DB}"
  [[ "$ENV_DB" == "aph_website" ]] && warn "this is the PRODUCTION database"
  if [[ $DRY -eq 1 ]]; then
    echo "  + (cd $NEW_REL && NUXT_DB_NAME=$ENV_DB npm run db:migrate)"
  else
    ( cd "$NEW_REL" && NUXT_DB_NAME="$ENV_DB" npm run db:migrate )
    ok "migrations applied to ${ENV_DB}"
  fi
fi

# ── 5. activate + health check, with automatic rollback ───────────────────
PREVIOUS_TARGET="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

activate() {
  say "activating $(basename "$1") → current-$TARGET_PORT"
  run ln -sfn "$1" "$CURRENT_LINK"
  restart_unit
  # give the process a moment to bind before probing it
  [[ $DRY -eq 1 ]] || sleep "${WARMUP_SECONDS:-2}"

}

health() {
  local port="$1" tries="${2:-30}" i
  for ((i = 1; i <= tries; i++)); do
    if curl -fsS "http://127.0.0.1:${port}/api/health" 2>/dev/null | grep -q '"ok":true'; then
      return 0
    fi
    sleep 1
  done
  return 1
}

if [[ $DRY -eq 1 ]]; then
  echo "  + ln -sfn $NEW_REL $CURRENT_LINK"
  echo "  + restart aph-nuxt@${TARGET_PORT}${DEPLOY_RESTART_CMD:+ (override: ${DEPLOY_RESTART_CMD//@PORT@/$TARGET_PORT})}"
  echo "  + curl -fsS http://127.0.0.1:${TARGET_PORT}/api/health   # must return \"ok\":true"
  if [[ $IS_PROD -eq 1 ]]; then
    echo "  + write /etc/nginx/aph-upstream-www.conf with 127.0.0.1:${TARGET_PORT}, then nginx -s reload"
  fi
  say "dry run finished"
  exit 0
fi

# stop condition: keep the old slot serving until the new one is proven
activate "$NEW_REL"

if health "$TARGET_PORT" 40; then
  ok "health OK on :${TARGET_PORT}"
else
  warn "health check FAILED on :${TARGET_PORT}"
  if [[ -n "$PREVIOUS_TARGET" && -d "$PREVIOUS_TARGET" ]]; then
    warn "rolling back to $(basename "$PREVIOUS_TARGET")"
    ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK"
    restart_unit
    health "$TARGET_PORT" 20 && warn "serving the previous release again — deploy ABORTED" || die "rollback also failed — check journalctl -u aph-nuxt@${TARGET_PORT}"
  fi
  exit 1
fi

# ── 6. www only: flip the edge upstream (this is the zero-downtime moment) ─
if [[ $IS_PROD -eq 1 ]]; then
  say "flipping edge upstream → :${TARGET_PORT}"
  TMP_UPSTREAM="$(mktemp)"
  if [[ -f "$UPSTREAM_FILE" ]]; then
    "$SUDO" cp -f "$UPSTREAM_FILE" "${UPSTREAM_FILE}.bak"
    sed "s/127\.0\.0\.1:[0-9]\+/127.0.0.1:${TARGET_PORT}/" "$UPSTREAM_FILE" > "$TMP_UPSTREAM"
  else
    printf 'server 127.0.0.1:%s max_fails=2 fail_timeout=5s;\n' "$TARGET_PORT" > "$TMP_UPSTREAM"
  fi
  # install gives a predictable 644 (nginx must be able to read it after a restart)
  "$SUDO" install -m 644 "$TMP_UPSTREAM" "$UPSTREAM_FILE" && rm -f "$TMP_UPSTREAM"
  if [[ -n "${NGINX_RELOAD_CMD:-}" ]]; then
    eval "$NGINX_RELOAD_CMD"
    ok "reload hook ran — traffic now served by :${TARGET_PORT}"
  elif "$SUDO" nginx -t >>/dev/null 2>&1; then
    "$SUDO" nginx -s reload
    ok "traffic now served by :${TARGET_PORT} (previous slot still warm for instant rollback)"
  else
    if [[ -f "${UPSTREAM_FILE}.bak" ]]; then "$SUDO" mv -f "${UPSTREAM_FILE}.bak" "$UPSTREAM_FILE"; fi
    die "nginx config invalid — upstream NOT changed"
  fi
fi

# ── 7. prune old releases ─────────────────────────────────────────────────
say "pruning (keep ${KEEP})"
CURRENT_REAL="$(readlink -f "$CURRENT_LINK")"
ls -1dt "$RELEASES_DIR"/"${ENV_NAME}"-* 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  [[ "$(readlink -f "$old")" == "$CURRENT_REAL" ]] && continue
  rm -rf "$old" && echo "  · removed $(basename "$old")"
done

# ── 8. deploy log + summary ───────────────────────────────────────────────
printf '%s\t%s\t%s\t%s\t%s\n' \
  "$(date -u +%FT%TZ)" "$ENV_NAME" "$(basename "$NEW_REL")" ":$TARGET_PORT" "${REF}" \
  >> "$SHARED_DIR/deploy.log" 2>/dev/null || true

say "done"
echo "  host    : https://${ENV_HOST}"
echo "  release : $(basename "$NEW_REL")"
echo "  verify  : npm run check:staging -- --url https://${ENV_HOST}$([[ -n "${AUTH_HINT:-}" ]] && echo ' --auth aph:…')"
if [[ $IS_PROD -eq 1 ]]; then
  if [[ "$TARGET_PORT" == "$ENV_PORT" ]]; then OTHER_SLOT=green; else OTHER_SLOT=blue; fi
  echo "  rollback: ./deploy/deploy.sh --env www --slot ${OTHER_SLOT}"
else
  echo "  rollback: ./deploy/deploy.sh --env ${ENV_NAME} --rollback"
fi
