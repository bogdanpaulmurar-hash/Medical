#!/usr/bin/env bash
# ROLLBACK — readuce repo-ul la proprietarul vechi, cu aceleași funcții oficiale de transfer,
# și readuce variabilele/Pages din instantaneu. Se rulează din contul care e acum
# admin/Owner pe repo (de regulă Bogdan, cât timp e încă Owner în organizația medicului).
#
# Folosire: ./09-rollback.sh [--apply]
#
# Ce NU face singur (acțiune de owner în dashboard): transferul înapoi al proiectului
# Supabase. Instrucțiunile se afișează la final. Pentru varianta B nu e nevoie: proiectul
# vechi a rămas neatins, se refac doar variabilele (pasul 03 rulat aici, fără NEW_*).
source "$(dirname "$0")/lib.sh"
need gh jq
need_var SRC_REPO DST_OWNER

orig_owner="${SRC_REPO%%/*}"
orig_name="${SRC_REPO#*/}"
cur_repo="$DST_OWNER/$REPO_NAME"   # REPO_NAME = numele ales la transfer
args=(); [[ $APPLY -eq 1 ]] && args+=(--apply)

if gh api "repos/$cur_repo" >/dev/null 2>&1; then
  info "Repo-ul e la $cur_repo; îl readuc la $orig_owner."
  ALLOW_OLD_SNAPSHOT=1 SRC_REPO="$cur_repo" DST_OWNER="$orig_owner" REPO_NAME="$orig_name" bash "$HERE/02-github-transfer.sh" "${args[@]}"
else
  info "Repo-ul nu e la $cur_repo (poate nu a fost transferat): sar peste transferul înapoi."
fi
unset NEW_SUPABASE_URL NEW_SUPABASE_ANON_KEY
DST_OWNER="$orig_owner" REPO_NAME="$orig_name" bash "$HERE/03-github-after.sh" "${args[@]}"

cat <<EOF

Supabase (dacă proiectul a fost transferat, varianta A) — ACȚIUNE DE OWNER:
  Medicul (Owner în organizația lui) deschide
  https://supabase.com/dashboard/project/$SUPABASE_REF/settings/general → „Transfer project”
  → organizația veche. Adresa și cheile rămân aceleași, aplicația nu se schimbă.
Apoi: APP_URL=$(pages_url_for "$orig_owner" "$orig_name") ./05-supabase-auth-urls.sh --apply
      APP_URL=$(pages_url_for "$orig_owner" "$orig_name") ./06-smoke-test.sh
EOF
