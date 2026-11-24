#!/usr/bin/env bash
# PASUL 2 — Transferul repo-ului GitHub prin funcția oficială de transfer
# (POST /repos/{owner}/{repo}/transfer). Codul, istoricul, ramurile, PR-urile,
# issue-urile, regulile și workflow-urile se mută cu tot cu repo; nimic nu se copiază de mână.
#
# Folosire:
#   ./02-github-transfer.sh            # probă: verifică tot și arată ce s-ar face
#   ./02-github-transfer.sh --apply    # transferul real (cere confirmare tastată)
#
# Condiții (verificate automat):
#   * există un instantaneu recent (01-snapshot.sh);
#   * contul gh curent e admin pe repo;
#   * DST_OWNER există; dacă e organizație, contul curent poate crea repo-uri în ea
#     (medicul l-a invitat pe Bogdan ca Owner temporar); dacă e cont personal,
#     medicul trebuie să ACCEPTE transferul din emailul primit (expiră după o zi).
source "$(dirname "$0")/lib.sh"
need gh jq
need_var SRC_REPO DST_OWNER
mode_banner

snap="$(latest_snapshot)"
age_min=$(( ( $(date +%s) - $(stat -c %Y "$snap") ) / 60 ))
(( age_min < 24*60 )) || [[ "${ALLOW_OLD_SNAPSHOT:-0}" == "1" ]] || die "Instantaneul $snap are peste o zi. Rulați din nou 01-snapshot.sh."
ok "Instantaneu: $snap (acum $age_min min)"

[[ "$(gh api "repos/$SRC_REPO" --jq .permissions.admin)" == "true" ]] || die "Nu sunteți admin pe $SRC_REPO (sau a fost deja transferat)."

dst_type="$(gh api "users/$DST_OWNER" --jq .type 2>/dev/null)" || die "Contul/organizația „$DST_OWNER” nu există pe GitHub."
dst_repo="$DST_OWNER/$REPO_NAME"
if gh api "repos/$dst_repo" >/dev/null 2>&1; then die "Există deja $dst_repo. Alegeți alt nume sau ștergeți-l pe cel gol."; fi

if [[ "$dst_type" == "Organization" ]]; then
  me="$(gh api user --jq .login)"
  role="$(gh api "orgs/$DST_OWNER/memberships/$me" --jq '.state + "/" + .role' 2>/dev/null || echo "none")"
  [[ "$role" == "active/admin" ]] || die "Contul $me nu e Owner activ în organizația $DST_OWNER (stare: $role). Medicul trebuie să-l invite ca Owner și invitația să fie acceptată."
  ok "Destinație: organizația $DST_OWNER (sunteți Owner, transferul e imediat)"
else
  warn "Destinație: cont personal $DST_OWNER. Transferul rămâne în așteptare până când medicul îl acceptă din email (24 h)."
fi

old_pages="$(jq -r '.html_url // empty' "$snap/gh-pages.json")"
new_pages="$(pages_url_for "$DST_OWNER" "$REPO_NAME")"
cat <<EOF

Ce se va întâmpla:
  1. $SRC_REPO → $dst_repo (redirect automat pentru git și pentru link-urile github.com).
  2. Adresa aplicației se schimbă: ${old_pages:-?} → $new_pages
     GitHub NU face redirect pentru Pages: linkul vechi nu va mai merge după publicarea noului site.
  3. Variabilele, Pages și publicarea se verifică/refac imediat după, cu 03-github-after.sh.

EOF

confirm_typed "$dst_repo" "Transferul repo-ului este un pas real. Se poate face înapoi doar de noul proprietar."
run gh api -X POST "repos/$SRC_REPO/transfer" -f new_owner="$DST_OWNER" -f new_name="$REPO_NAME" --silent

if [[ $APPLY -eq 1 ]]; then
  info "Aștept ca repo-ul să apară la $dst_repo…"
  for _ in $(seq 1 30); do
    if gh api "repos/$dst_repo" --jq .full_name 2>/dev/null | grep -qi "^$dst_repo$"; then
      ok "Transferat: https://github.com/$dst_repo"
      info "Următorul pas: ./03-github-after.sh --apply"
      exit 0
    fi
    sleep 5
  done
  [[ "$dst_type" == "User" ]] && { info "Transfer trimis. Medicul trebuie să-l accepte din email, apoi rulați 03-github-after.sh."; exit 0; }
  die "Repo-ul nu a apărut la $dst_repo în 2,5 minute. Verificați https://github.com/$DST_OWNER înainte de orice alt pas."
fi
