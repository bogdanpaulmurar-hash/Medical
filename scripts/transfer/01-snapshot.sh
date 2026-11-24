#!/usr/bin/env bash
# PASUL 1 — Instantaneu + copie de siguranță. DOAR CITEȘTE, nu modifică nimic.
#
# Salvează (în afara repo-ului, în $SNAPSHOT_ROOT/snapshot-<data>):
#   * GitHub: setările repo-ului, variabilele Actions (cu valori), configurarea Pages,
#     mediile (environments), ramurile, regulile de protecție, workflow-urile;
#   * Supabase: detaliile proiectului, configurarea Auth (Site URL, Redirect URLs),
#     Edge Functions și numele secretelor lor (fără valori);
#   * baza de date (dacă e setat SUPABASE_DB_URL): roluri, schemă și date, plus
#     numărul de rânduri pe tabel, ca să comparăm după transfer.
# Instantaneul e sursa pentru 03-github-after.sh și pentru rollback.
#
# Folosire: ./01-snapshot.sh
source "$(dirname "$0")/lib.sh"
need gh jq curl

ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="$SNAPSHOT_ROOT/snapshot-$ts"
mkdir -p "$out"
chmod 700 "$SNAPSHOT_ROOT" "$out"
info "Instantaneu în $out"

# ---------------- GitHub ----------------
gh auth status >/dev/null 2>&1 || die "gh nu e autentificat: rulați 'gh auth login'."
gh api "repos/$SRC_REPO" > "$out/gh-repo.json"
[[ "$(jq -r .permissions.admin "$out/gh-repo.json")" == "true" ]] || die "Contul gh curent nu e admin pe $SRC_REPO."
ok "Repo: $(jq -r '.full_name + " (" + .visibility + ", ramura implicită " + .default_branch + ")"' "$out/gh-repo.json")"

gh api "repos/$SRC_REPO/actions/variables" --paginate > "$out/gh-variables.json"
ok "Variabile Actions: $(jq -r '[.variables[].name] | join(", ") | if .=="" then "(niciuna)" else . end' "$out/gh-variables.json")"
gh api "repos/$SRC_REPO/actions/secrets" --paginate | jq '{secrets: [.secrets[].name]}' > "$out/gh-secret-names.json"
n_sec="$(jq '.secrets | length' "$out/gh-secret-names.json")"
[[ "$n_sec" == "0" ]] && ok "Secrete Actions: niciunul" || warn "Secrete Actions: $n_sec (valorile nu pot fi citite; vezi gh-secret-names.json și puneți-le din nou după transfer)."

gh api "repos/$SRC_REPO/pages" > "$out/gh-pages.json" 2>/dev/null || echo '{}' > "$out/gh-pages.json"
ok "Pages: $(jq -r '(.html_url // "neactivat") + " (" + (.build_type // "-") + ")"' "$out/gh-pages.json")"
gh api "repos/$SRC_REPO/environments" > "$out/gh-environments.json" 2>/dev/null || echo '{}' > "$out/gh-environments.json"
gh api "repos/$SRC_REPO/branches" --paginate > "$out/gh-branches.json"
gh api "repos/$SRC_REPO/rulesets" > "$out/gh-rulesets.json" 2>/dev/null || echo '[]' > "$out/gh-rulesets.json"
gh api "repos/$SRC_REPO/actions/workflows" > "$out/gh-workflows.json"
gh api "repos/$SRC_REPO/actions/permissions" > "$out/gh-actions-permissions.json"
gh api "repos/$SRC_REPO/collaborators" --paginate > "$out/gh-collaborators.json" 2>/dev/null || true
gh api "repos/$SRC_REPO/hooks" > "$out/gh-webhooks.json" 2>/dev/null || true
ok "Ramuri: $(jq -r '[.[].name] | join(", ")' "$out/gh-branches.json")"

# Copie completă a codului (toate ramurile), independentă de GitHub.
git clone --mirror --quiet "https://github.com/$SRC_REPO.git" "$out/repo-mirror.git"
ok "Copie git completă: repo-mirror.git"

# ---------------- Supabase ----------------
if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  sb_api GET "/v1/projects/$SUPABASE_REF" > "$out/sb-project.json"
  ok "Supabase: $(jq -r '.name + " · regiune " + .region + " · org " + .organization_id + " · " + .status' "$out/sb-project.json")"
  sb_api GET "/v1/projects/$SUPABASE_REF/config/auth" \
    | jq '{site_url, uri_allow_list, disable_signup, external_email_enabled, smtp_host, smtp_admin_email, mailer_autoconfirm}' > "$out/sb-auth.json"
  ok "Auth: Site URL = $(jq -r .site_url "$out/sb-auth.json"), înscriere liberă dezactivată = $(jq -r .disable_signup "$out/sb-auth.json")"
  sb_api GET "/v1/projects/$SUPABASE_REF/functions" > "$out/sb-functions.json" || echo '[]' > "$out/sb-functions.json"
  sb_api GET "/v1/projects/$SUPABASE_REF/secrets" | jq '[.[].name]' > "$out/sb-secret-names.json" || echo '[]' > "$out/sb-secret-names.json"
  ok "Edge Functions: $(jq -r '[.[].slug] | join(", ") | if .=="" then "(niciuna)" else . end' "$out/sb-functions.json")"
  # Cheia anon e publică prin design (e oricum în aplicație); o păstrăm pentru verificare.
  sb_api GET "/v1/projects/$SUPABASE_REF/api-keys" | jq '[.[] | select(.name=="anon") | {name, api_key}]' > "$out/sb-anon-key.json" || true
else
  warn "SUPABASE_ACCESS_TOKEN nu e setat: se sare peste partea Supabase a instantaneului."
fi

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  need psql pg_dump
  info "Copie de siguranță a bazei (poate dura un minut)…"
  # Aceleași trei fișiere ca în ghidul oficial Supabase „Backup and restore using the CLI”.
  if command -v supabase >/dev/null; then
    supabase db dump --db-url "$SUPABASE_DB_URL" -f "$out/db-roles.sql" --role-only
    supabase db dump --db-url "$SUPABASE_DB_URL" -f "$out/db-schema.sql"
    supabase db dump --db-url "$SUPABASE_DB_URL" -f "$out/db-data.sql" --use-copy --data-only
  else
    warn "Supabase CLI lipsește: folosesc pg_dump (bun ca arhivă; pentru restaurare preferați CLI-ul)."
    pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -n public -n auth -n storage -f "$out/db-full.sql"
  fi
  psql "$SUPABASE_DB_URL" -At -v ON_ERROR_STOP=1 -f "$HERE/sql/row-counts.sql" > "$out/db-row-counts.txt"
  ok "Rânduri pe tabel salvate în db-row-counts.txt:"
  sed 's/^/    /' "$out/db-row-counts.txt"
  chmod 600 "$out"/db-*
else
  warn "SUPABASE_DB_URL nu e setat: fără copie a bazei. (Azi baza nu are pacienți sau utilizatori, dar faceți copia dacă între timp s-au adăugat.)"
fi

echo "$out" > "$SNAPSHOT_ROOT/LATEST"
ok "Gata. Instantaneu: $out"
