#!/usr/bin/env bash
# PASUL 4 — Proiectul Supabase trece în organizația medicului prin funcția oficială
# „Transfer project” (Project Settings → General). Proiectul rămâne același: aceeași
# adresă, aceleași chei, aceeași bază, aceleași date. Aplicația nu trebuie schimbată.
#
# Transferul propriu-zis e UN CLIC în dashboard (acțiune de owner, vezi docs/TRANSFER.md).
# Scriptul face verificările înainte și după, ca să nu fie nimic de ghicit.
#
# Folosire:
#   ./04-supabase-transfer.sh            # înainte: verifică eligibilitatea
#   ./04-supabase-transfer.sh --verify   # după clic: confirmă că s-a mutat și că nimic nu s-a schimbat
source "$(dirname "$0")/lib.sh"
need curl jq
need_var SUPABASE_ACCESS_TOKEN SUPABASE_REF DST_SUPABASE_ORG_SLUG

VERIFY=0; for a in "$@"; do [[ "$a" == "--verify" ]] && VERIFY=1; done
snap="$(latest_snapshot)"

proj="$(sb_api GET "/v1/projects/$SUPABASE_REF")" || die "Nu pot citi proiectul $SUPABASE_REF cu token-ul dat."
cur_org="$(jq -r .organization_id <<<"$proj")"
orgs="$(sb_api GET /v1/organizations)"
dst_id="$(jq -r --arg s "$DST_SUPABASE_ORG_SLUG" '.[] | select(.id==$s or .slug==$s) | .id' <<<"$orgs" | head -n1)"

if [[ $VERIFY -eq 0 ]]; then
  info "Proiect: $(jq -r '.name + " (" + .region + ", " + .status + ")"' <<<"$proj"), organizația curentă: $cur_org"
  [[ -n "$dst_id" ]] || die "Contul dumneavoastră nu e membru în organizația „$DST_SUPABASE_ORG_SLUG”. Medicul trebuie să vă invite (Owner) și să acceptați invitația."
  [[ "$cur_org" != "$dst_id" ]] || { ok "Proiectul e deja în organizația medicului."; exit 0; }
  ok "Sunteți membru în organizația destinație ($dst_id)."
  [[ "$(jq -r .status <<<"$proj")" == "ACTIVE_HEALTHY" ]] || warn "Proiectul nu e ACTIVE_HEALTHY (poate e pus pe pauză): reporniți-l înainte."

  # Previzualizare oficială a transferului: eligibilitate și efecte (nu transferă nimic).
  if prev="$(sb_api POST "/v2/projects/$SUPABASE_REF/transfers/previews" -d "{\"target_organization_slug\":\"$DST_SUPABASE_ORG_SLUG\"}" 2>/dev/null)"; then
    echo "$prev" > "$snap/sb-transfer-preview.json"
    info "Previzualizare transfer (salvată în sb-transfer-preview.json):"
    jq . <<<"$prev" | sed 's/^/    /'
  else
    warn "Previzualizarea prin API nu a răspuns; dashboard-ul arată aceeași verificare în fereastra de transfer."
  fi

  cat <<EOF

ACȚIUNE DE OWNER ÎN DASHBOARD (Bogdan, ca Owner al organizației actuale):
  1. https://supabase.com/dashboard/project/$SUPABASE_REF/settings/general
  2. „Transfer project” → organizația „$DST_SUPABASE_ORG_SLUG” → confirmați.
  Condiții Supabase: Owner pe organizația sursă, membru în cea destinație, fără
  integrare GitHub conectată, fără log drains. Organizația gratuită a medicului
  poate avea cel mult 2 proiecte gratuite.
Apoi rulați: ./04-supabase-transfer.sh --verify
EOF
  exit 0
fi

# ---------- --verify ----------
[[ "$cur_org" == "$dst_id" ]] || die "Proiectul e încă în organizația $cur_org (așteptat: $dst_id)."
ok "Proiectul e în organizația medicului ($dst_id)."
[[ "$(jq -r .id <<<"$proj")" == "$SUPABASE_REF" ]] && ok "Același proiect (ref $SUPABASE_REF): adresa https://$SUPABASE_REF.supabase.co nu s-a schimbat."
if [[ -s "$snap/sb-anon-key.json" ]]; then
  before="$(jq -r '.[0].api_key // empty' "$snap/sb-anon-key.json")"
  now="$(sb_api GET "/v1/projects/$SUPABASE_REF/api-keys" | jq -r '.[] | select(.name=="anon") | .api_key')"
  [[ -z "$before" || "$before" == "$now" ]] && ok "Cheia anon e aceeași: variabilele GitHub rămân valabile." \
    || warn "Cheia anon s-a schimbat: rulați 03-github-after.sh cu NEW_SUPABASE_ANON_KEY=<cheia nouă> --apply."
fi
info "Următorul pas: ./05-supabase-auth-urls.sh, apoi ./06-smoke-test.sh"
