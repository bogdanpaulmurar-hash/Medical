#!/usr/bin/env bash
# PASUL 3 — După transferul GitHub: readuce repo-ul la starea din instantaneu.
# Idempotent: îl puteți rula de câte ori vreți; schimbă doar ce diferă.
#
#   * verifică Actions activ în noua organizație;
#   * variabilele Actions (VITE_SUPABASE_*, TEST_SUPABASE_* etc.) — din instantaneu;
#     dacă proiectul Supabase s-a schimbat (varianta B), dați NEW_SUPABASE_URL și
#     NEW_SUPABASE_ANON_KEY și se folosesc acelea;
#   * GitHub Pages cu sursa „GitHub Actions”;
#   * pornește publicarea (pages.yml) și așteaptă să se termine.
#
# Folosire: ./03-github-after.sh [--apply]
source "$(dirname "$0")/lib.sh"
need gh jq
need_var DST_OWNER
mode_banner

snap="$(latest_snapshot)"
repo="$DST_OWNER/$REPO_NAME"
gh api "repos/$repo" >/dev/null 2>&1 || die "Nu găsesc $repo. Transferul (pasul 2) s-a terminat?"
ok "Repo: https://github.com/$repo"

# --- Actions ---
enabled="$(gh api "repos/$repo/actions/permissions" --jq .enabled)"
if [[ "$enabled" != "true" ]]; then
  warn "Actions e dezactivat pe repo (politica organizației)."
  run gh api -X PUT "repos/$repo/actions/permissions" -F enabled=true -f allowed_actions=all --silent
else ok "Actions activ"; fi

# --- Variabile ---
declare -A want
while IFS=$'\t' read -r name value; do [[ -n "$name" ]] && want["$name"]="$value"; done \
  < <(jq -r '.variables[] | [.name, .value] | @tsv' "$snap/gh-variables.json")
[[ -n "${NEW_SUPABASE_URL:-}" ]] && want[VITE_SUPABASE_URL]="$NEW_SUPABASE_URL"
[[ -n "${NEW_SUPABASE_ANON_KEY:-}" ]] && want[VITE_SUPABASE_ANON_KEY]="$NEW_SUPABASE_ANON_KEY"

declare -A have
while IFS=$'\t' read -r name value; do [[ -n "$name" ]] && have["$name"]="$value"; done \
  < <(gh api "repos/$repo/actions/variables" --paginate --jq '.variables[] | [.name, .value] | @tsv')

if [[ ${#want[@]} -eq 0 ]]; then
  info "Instantaneul nu are variabile Actions (aplicația era în mod demo). Nimic de refăcut."
fi
for name in "${!want[@]}"; do
  if [[ "${have[$name]-__lipsa__}" == "${want[$name]}" ]]; then ok "Variabila $name: deja corectă"
  else run gh variable set "$name" --repo "$repo" --body "${want[$name]}"; fi
done

n_sec="$(jq '.secrets | length' "$snap/gh-secret-names.json")"
[[ "$n_sec" == "0" ]] || warn "Instantaneul are $n_sec secrete Actions: valorile trebuie puse de mână (Settings → Secrets). Lista: $(jq -r '.secrets | join(", ")' "$snap/gh-secret-names.json")"

# --- Pages ---
if gh api "repos/$repo/pages" >/dev/null 2>&1; then
  bt="$(gh api "repos/$repo/pages" --jq .build_type)"
  if [[ "$bt" == "workflow" ]]; then ok "Pages: sursa GitHub Actions"
  else run gh api -X PUT "repos/$repo/pages" -f build_type=workflow --silent; fi
else
  run gh api -X POST "repos/$repo/pages" -f build_type=workflow --silent
fi

# --- Publicare ---
info "Pornesc publicarea site-ului (pages.yml pe main)…"
run gh workflow run pages.yml --repo "$repo" --ref main
if [[ $APPLY -eq 1 ]]; then
  sleep 8
  run_id="$(gh run list --repo "$repo" --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
  gh run watch "$run_id" --repo "$repo" --exit-status || die "Publicarea a eșuat: gh run view $run_id --repo $repo --log-failed"
  url="$(gh api "repos/$repo/pages" --jq .html_url)"
  ok "Site publicat: $url"
  echo "$url" > "$snap/NEW_PAGES_URL"
  info "Următorul pas: Supabase (04-supabase-transfer.sh), apoi 05-supabase-auth-urls.sh și 06-smoke-test.sh"
fi
