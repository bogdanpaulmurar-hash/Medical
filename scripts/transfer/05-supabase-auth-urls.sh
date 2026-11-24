#!/usr/bin/env bash
# PASUL 5 — Adresa aplicației în Supabase Auth (Site URL + Redirect URLs).
# După transferul GitHub, site-ul are adresă nouă; linkurile din emailurile de
# invitație și resetare parolă trebuie să ducă acolo. Se face prin Management API,
# fără copiere de mână în dashboard.
#
# Adresa nouă se ia din instantaneu (NEW_PAGES_URL, scris de 03-github-after.sh)
# sau din variabila APP_URL.
#
# Folosire: ./05-supabase-auth-urls.sh [--apply]
source "$(dirname "$0")/lib.sh"
need curl jq
need_var SUPABASE_ACCESS_TOKEN SUPABASE_REF
mode_banner

snap="$(latest_snapshot)"
app_url="${APP_URL:-$(cat "$snap/NEW_PAGES_URL" 2>/dev/null || true)}"
[[ -n "$app_url" ]] || { need_var DST_OWNER; app_url="$(pages_url_for "$DST_OWNER" "$REPO_NAME")"; }
app_url="${app_url%/}/"

cur="$(sb_api GET "/v1/projects/$SUPABASE_REF/config/auth")"
cur_site="$(jq -r '.site_url // ""' <<<"$cur")"
cur_list="$(jq -r '.uri_allow_list // ""' <<<"$cur")"

# Adresele vechi rămân în listă până la curățenia finală (permit rollback fără pierderi);
# se adaugă cele noi: aplicația reală și versiunea de test.
new_list="$(printf '%s\n' ${cur_list//,/ } "$app_url" "${app_url}test/" "${app_url}**" | awk 'NF && !seen[$0]++' | paste -sd, -)"

info "Site URL:      ${cur_site:-(gol)} → $app_url"
info "Redirect URLs: ${cur_list:-(gol)}"
info "           →   $new_list"
if [[ "$cur_site" == "$app_url" && "$cur_list" == "$new_list" ]]; then ok "Deja corect."; exit 0; fi

body="$(jq -n --arg s "$app_url" --arg l "$new_list" '{site_url: $s, uri_allow_list: $l}')"
if [[ $APPLY -eq 1 ]]; then
  sb_api PATCH "/v1/projects/$SUPABASE_REF/config/auth" -d "$body" >/dev/null
  ok "Actualizat."
else
  printf '%s[probă]%s PATCH /v1/projects/%s/config/auth %s\n' "$c_yel" "$c_off" "$SUPABASE_REF" "$body"
fi
