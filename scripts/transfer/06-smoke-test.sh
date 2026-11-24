#!/usr/bin/env bash
# PASUL 6 — Verificare după transfer (smoke test). DOAR CITEȘTE.
# Se poate rula oricând: înainte de transfer (pe adresa veche), după, și la rollback.
#
# Verifică:
#   1. site-ul răspunde și este Vademecum MFR (aplicația reală și /test/);
#   2. ce backend are „copt” în cod: proiectul Supabase așteptat sau mod demo;
#   3. Supabase răspunde (Auth) și RLS blochează accesul anonim la date;
#   4. (cu SUPABASE_DB_URL) numărul de rânduri e identic cu instantaneul;
#   5. (cu DST_OWNER și gh) ultima publicare GitHub Pages a reușit.
#
# Folosire: APP_URL=https://<org>.github.io/Medical/ ./06-smoke-test.sh
#           (fără APP_URL: adresa din instantaneu sau cea calculată din DST_OWNER)
source "$(dirname "$0")/lib.sh"
need curl jq

fails=0
pass() { ok "$*"; }
fail() { printf '%s✗%s %s\n' "$c_red" "$c_off" "$*"; fails=$((fails+1)); }

snap="$(ls -1d "$SNAPSHOT_ROOT"/snapshot-* 2>/dev/null | sort | tail -n1 || true)"
app_url="${APP_URL:-$( [[ -n "$snap" ]] && cat "$snap/NEW_PAGES_URL" 2>/dev/null || true)}"
[[ -n "$app_url" ]] || { need_var DST_OWNER; app_url="$(pages_url_for "$DST_OWNER" "$REPO_NAME")"; }
app_url="${app_url%/}/"
info "Aplicația: $app_url"

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

# 1. Site
check_site() { # url eticheta
  local url="$1" label="$2" code
  code="$(curl -sS -L -o "$tmp/page.html" -w '%{http_code}' "$url" || echo 000)"
  if [[ "$code" == "200" ]] && grep -q '<title>Vademecum MFR</title>' "$tmp/page.html"; then pass "$label răspunde (200, Vademecum MFR)"; return 0
  else fail "$label: HTTP $code sau pagina nu e Vademecum MFR ($url)"; return 1; fi
}
backend_of() { # url → afișează backend-ul din pachetul JS
  local url="$1" js
  js="$(grep -oE '(\./)?assets/index-[A-Za-z0-9_-]+\.js' "$tmp/page.html" | head -n1 | sed 's#^\./##' || true)"
  [[ -n "$js" ]] || { fail "Nu găsesc pachetul JS în $url"; return; }
  curl -sS -L -o "$tmp/app.js" "$url$js" || { fail "Nu pot descărca $url$js"; return; }
  local refs; refs="$(grep -oE 'https://[a-z0-9]{20}\.supabase\.co' "$tmp/app.js" | sort -u | paste -sd' ' - || true)"
  if [[ -z "$refs" ]]; then info "  backend: MOD DEMO (nu sunt setate VITE_SUPABASE_*)"
  elif [[ "$refs" == *"$SUPABASE_REF"* ]]; then pass "  backend: Supabase $SUPABASE_REF"
  else fail "  backend: alt proiect Supabase decât cel așteptat ($refs)"; fi
}
check_site "$app_url" "Aplicația reală" && backend_of "$app_url"
check_site "${app_url}test/" "Versiunea de test" && backend_of "${app_url}test/"

# 2. Supabase
anon=""
[[ -n "$snap" && -s "$snap/sb-anon-key.json" ]] && anon="$(jq -r '.[0].api_key // empty' "$snap/sb-anon-key.json")"
anon="${SUPABASE_ANON_KEY:-$anon}"
sb_url="https://$SUPABASE_REF.supabase.co"
if [[ -n "$anon" ]]; then
  code="$(curl -sS -o /dev/null -w '%{http_code}' "$sb_url/auth/v1/health" -H "apikey: $anon" || echo 000)"
  [[ "$code" == "200" ]] && pass "Supabase Auth răspunde ($sb_url)" || fail "Supabase Auth: HTTP $code"
  body="$(curl -sS "$sb_url/rest/v1/procedures?select=id&limit=1" -H "apikey: $anon" -H "Authorization: Bearer $anon" || true)"
  [[ "$body" == "[]" ]] && pass "RLS: un vizitator neautentificat nu vede date" || fail "RLS: răspuns neașteptat pentru acces anonim: ${body:0:120}"
else
  info "Fără cheie anon (nici în instantaneu, nici în SUPABASE_ANON_KEY): sar peste verificările Supabase prin API."
fi

# 3. Bază de date vs instantaneu
if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  need psql
  psql "$SUPABASE_DB_URL" -At -v ON_ERROR_STOP=1 -f "$HERE/sql/row-counts.sql" > "$tmp/counts.txt" || fail "Nu mă pot conecta la bază"
  if [[ -n "$snap" && -s "$snap/db-row-counts.txt" ]]; then
    if diff -u "$snap/db-row-counts.txt" "$tmp/counts.txt" > "$tmp/diff.txt"; then pass "Baza: același număr de rânduri ca în instantaneu"
    else warn "Baza diferă de instantaneu (normal doar dacă între timp s-a lucrat în aplicație):"; sed 's/^/    /' "$tmp/diff.txt"; fi
  else sed 's/^/    /' "$tmp/counts.txt"; fi
  grep -q 'migration_0006_overlap_ok=t' "$tmp/counts.txt" && pass "Migrările sunt la zi (0006 aplicată)" || fail "Migrarea 0006 lipsește"
fi

# 4. Ultima publicare
if [[ -n "${DST_OWNER:-}" ]] && command -v gh >/dev/null && gh api "repos/$DST_OWNER/$REPO_NAME" >/dev/null 2>&1; then
  concl="$(gh run list --repo "$DST_OWNER/$REPO_NAME" --workflow pages.yml --limit 1 --json conclusion --jq '.[0].conclusion')"
  [[ "$concl" == "success" ]] && pass "Ultima publicare Pages: reușită" || fail "Ultima publicare Pages: ${concl:-necunoscut}"
fi

echo
if [[ $fails -eq 0 ]]; then ok "Toate verificările au trecut."; else die "$fails verificări au eșuat."; fi
