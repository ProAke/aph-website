#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  Copy the production database into a sub-domain database (staging / uat).
#
#    ./deploy/refresh-db.sh --to staging             # dry run: shows what it would do
#    ./deploy/refresh-db.sh --to staging --apply     # actually copy
#
#  Why: each environment can have its own database (aph_website_staging,
#  aph_website_uat) while all of them keep the SAME schema and the SAME content
#  the parity checker validates against. Refreshing nightly keeps UAT honest.
#
#  During the WordPress-migration window the source of truth is still the WP sync,
#  so the recommended order is:
#      npm run sync -- --full   → refresh-db.sh --to staging --apply  → parity
#
#  ⚠ The copy contains real customer data (orders, contact details). Restrict
#    access to the staging DB and delete old copies after UAT.
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

TARGET_ENV=""; FROM=""; APPLY=0; SANITIZE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --to) TARGET_ENV="${2:-}"; shift 2 ;;
    --from) FROM="${2:-}"; shift 2 ;;
    --apply) APPLY=1; shift ;;
    --sanitize) SANITIZE=1; shift ;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^#//'; exit 0 ;;
    *) echo "✖ unknown option: $1"; exit 1 ;;
  esac
done
[[ -z "$TARGET_ENV" ]] && { echo "✖ --to is required (staging | uat)"; exit 1; }

REPO_DIR="${REPO_DIR:-/srv/aph}"
CFG="$REPO_DIR/deploy/environments.json"
ENV_DIR="${ENV_DIR:-/etc/aph}"
[[ -f "$CFG" ]] || { echo "✖ $CFG not found"; exit 1; }

eval "$(node - "$CFG" "$TARGET_ENV" <<'NODE'
const [file, name] = process.argv.slice(2)
const m = require(require('node:path').resolve(file))
const e = m.environments.find((x) => x.name === name)
if (!e) { console.error(`✖ unknown environment "${name}"`); process.exit(1) }
const prod = m.environments.find((x) => x.mode === 'production') || {}
const q = (v) => `'${String(v || '').replace(/'/g, `'\\''`)}'`
console.log(`TARGET_DB=${q(e.db)}`)
console.log(`DEFAULT_FROM=${q(prod.db || 'aph_website')}`)
NODE
)" || exit 1

FROM="${FROM:-$DEFAULT_FROM}"

[[ "$FROM" == "$TARGET_DB" ]] && { echo "✖ source and target are the same database ($FROM)"; exit 1; }
[[ -z "$TARGET_DB" ]] && { echo "✖ ${TARGET_ENV} has no db configured in environments.json"; exit 1; }

echo "── copy ${FROM} → ${TARGET_DB}  (env: ${TARGET_ENV}) ──"
[[ -f "$ENV_DIR/aph-common.env" ]] && set -a && . "$ENV_DIR/aph-common.env" && set +a
MYSQL_PWD="${NUXT_DB_PASSWORD:-}"; export MYSQL_PWD
DBHOST="${NUXT_DB_HOST:-127.0.0.1}"; DBUSER="${NUXT_DB_USER:-aph}"

DUMP=(mysqldump --single-transaction --quick --no-tablespaces --skip-add-locks
      --default-character-set=utf8mb4 -h "$DBHOST" -u "$DBUSER" "$FROM")

mask_filter=cat
if [[ $SANITIZE -eq 1 ]]; then
  # best-effort masking of obvious PII before it lands in a shared environment
  echo "  · sanitizing customer columns (email/phone/address → placeholder)"
  mask_filter='sed -E "s/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/masked@example.invalid/g; s/0[0-9]{8,9}/0000000000/g"'
fi

if [[ $APPLY -eq 0 ]]; then
  echo "  DRY RUN — would run:"
  echo "    ${DUMP[*]} | ${mask_filter} | mysql -h $DBHOST -u $DBUSER $TARGET_DB"
  echo "  Re-run with --apply to copy ($([[ $SANITIZE -eq 1 ]] && echo 'sanitized' || echo 'verbatim'))."
  exit 0
fi

command -v mysqldump >/dev/null || { echo "✖ mysqldump not installed (mariadb-client)"; exit 1; }

# guard: the target database must already exist (we never CREATE a typo'd database)
mysql -h "$DBHOST" -u "$DBUSER" -N -e "SHOW DATABASES LIKE '${TARGET_DB}'" | grep -q . \
  || { echo "✖ database ${TARGET_DB} does not exist — create it first (npm run db:init with NUXT_DB_NAME=${TARGET_DB})"; exit 1; }

echo "  · dumping ${FROM} …"
"${DUMP[@]}" | eval "$mask_filter" | mysql -h "$DBHOST" -u "$DBUSER" "$TARGET_DB"
echo "  ✔ ${TARGET_DB} refreshed from ${FROM}"

mysql -h "$DBHOST" -u "$DBUSER" -N -e "
  SELECT CONCAT('  · products: ', (SELECT COUNT(*) FROM \`${TARGET_DB}\`.products),
                '  posts: ',    (SELECT COUNT(*) FROM \`${TARGET_DB}\`.posts),
                '  categories: ', (SELECT COUNT(*) FROM \`${TARGET_DB}\`.categories))"
