#!/usr/bin/env bash
# Installs the pre-generated sub-domain vhosts (staging + uat) on the server.
#
#   ./deploy/install-subdomains.sh                 # DRY RUN — prints every command
#   sudo ./deploy/install-subdomains.sh --apply    # actually install (nginx + certbot + systemd)
#
# Prereqs: repo checked out at /srv/aph, `npm run build` done, `npm run vhost:gen -- --all` run,
#          DNS A records for both hosts already pointing here.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/srv/aph}"
APPLY=0
[[ "${1:-}" == "--apply" || "${2:-}" == "--apply" ]] && APPLY=1

cd "$REPO_DIR"

MAP="deploy/environments.json"
[[ -f "$MAP" ]] || { echo "✖ $MAP not found — run from the repo root"; exit 1; }

# host/mode/port triples without jq
readarray -t ROWS < <(node -e '
  const m = require("./deploy/environments.json");
  for (const e of m.environments) console.log([e.host, e.mode, e.port].join(" "));
')

run() {
  if [[ $APPLY -eq 1 ]]; then
    echo "+ $*"; "$@"
  else
    echo "  $*"
  fi
}

echo "── APH sub-domains ──────────────────────────────────"
for row in "${ROWS[@]}"; do
  read -r HOST MODE PORT <<<"$row"
  SRC="deploy/generated/${HOST}.conf"
  [[ -f "$SRC" ]] || { echo "✖ $SRC missing — run: npm run vhost:gen -- --all"; exit 1; }
  echo
  echo "▶ ${HOST}  (mode=${MODE}, port=${PORT})"
  run install -m 644 "$SRC" "/etc/nginx/sites-available/${HOST}"
  run ln -sfn "/etc/nginx/sites-available/${HOST}" "/etc/nginx/sites-enabled/${HOST}"
  if [[ ! -f "/etc/letsencrypt/live/${HOST}/fullchain.pem" ]]; then
    run certbot --nginx -d "$HOST" --redirect --non-interactive --agree-tos -m ops@aph-ita.co.th
  else
    echo "  ✔ certificate already present for ${HOST}"
  fi
done

echo
echo "▶ systemd instances"
PORTS=$(node -e 'const m=require("./deploy/environments.json");console.log(m.environments.filter(e=>e.mode!=="redirect").map(e=>`aph-nuxt@${e.port}`).join(" "))')
run install -m 644 deploy/systemd/aph-nuxt@.service /etc/systemd/system/aph-nuxt@.service
run systemctl daemon-reload
# shellcheck disable=SC2086
run systemctl enable --now $PORTS

echo
echo "▶ nginx reload"
run nginx -t
run systemctl reload nginx

echo
if [[ $APPLY -eq 0 ]]; then
  echo "DRY RUN — nothing changed. Re-run with: sudo $0 --apply"
else
  echo "✅ installed. Now verify:"
  echo "   npm run check:staging -- --url https://staging.aph-ita.co.th --auth aph:secret"
  echo "   npm run check:staging -- --url https://uat.aph-ita.co.th"
  echo "   curl -sI https://uat.aph-ita.co.th/ | grep -i x-robots-tag"
fi
