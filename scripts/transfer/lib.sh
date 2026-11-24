# shellcheck shell=bash
# Funcții comune pentru scripturile de transfer. Se încarcă cu `source`.
# Principiu: orice script care modifică ceva rulează implicit în MOD PROBĂ
# (afișează ce ar face). Modificările reale cer `--apply` și o confirmare tastată.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configurarea: transfer.env (copiat din transfer.env.example, nu se pune în git).
# Valorile date direct în linia de comandă (ex. `DST_OWNER=x ./script.sh`) au prioritate.
declare -A _preset=()
for _v in SRC_REPO DST_OWNER REPO_NAME SUPABASE_REF DST_SUPABASE_ORG_SLUG SUPABASE_ACCESS_TOKEN \
          SUPABASE_DB_URL NEW_SUPABASE_DB_URL SNAPSHOT_ROOT APP_URL SUPABASE_ANON_KEY; do
  [[ -n "${!_v:-}" ]] && _preset[$_v]="${!_v}"
done
if [[ -f "$HERE/transfer.env" ]]; then
  # shellcheck disable=SC1091
  source "$HERE/transfer.env"
fi
for _v in "${!_preset[@]}"; do printf -v "$_v" '%s' "${_preset[$_v]}"; done
unset _v

: "${SRC_REPO:=bogdanpaulmurar-hash/Medical}"
: "${REPO_NAME:=${SRC_REPO#*/}}"
: "${SUPABASE_REF:=yuqggvokpnqrpgizmgnw}"
: "${SNAPSHOT_ROOT:=$HOME/vademecum-transfer}"
SUPABASE_API="https://api.supabase.com"

APPLY=0
for a in "$@"; do [[ "$a" == "--apply" ]] && APPLY=1; done

c_red=$'\e[31m'; c_grn=$'\e[32m'; c_yel=$'\e[33m'; c_blu=$'\e[34m'; c_off=$'\e[0m'
info() { printf '%s•%s %s\n' "$c_blu" "$c_off" "$*"; }
ok()   { printf '%s✓%s %s\n' "$c_grn" "$c_off" "$*"; }
warn() { printf '%s!%s %s\n' "$c_yel" "$c_off" "$*" >&2; }
die()  { printf '%s✗ %s%s\n' "$c_red" "$*" "$c_off" >&2; exit 1; }

need() { for t in "$@"; do command -v "$t" >/dev/null || die "Lipsește programul '$t' (vezi docs/TRANSFER.md, Pregătire)."; done; }
need_var() { for v in "$@"; do [[ -n "${!v:-}" ]] || die "Lipsește variabila $v (completați scripts/transfer/transfer.env)."; done; }

# Rulează o comandă care MODIFICĂ ceva: în mod probă doar o afișează.
run() {
  if [[ $APPLY -eq 1 ]]; then
    printf '%s→%s %s\n' "$c_yel" "$c_off" "$*"
    "$@"
  else
    printf '%s[probă]%s %s\n' "$c_yel" "$c_off" "$*"
  fi
}

# Confirmare tastată pentru pașii care nu se pot anula ușor.
confirm_typed() {
  local expected="$1" msg="$2" answer
  [[ $APPLY -eq 1 ]] || return 0
  printf '%s%s%s\nTastați exact „%s” ca să continuați: ' "$c_red" "$msg" "$c_off" "$expected"
  read -r answer
  [[ "$answer" == "$expected" ]] || die "Anulat (text diferit)."
}

mode_banner() {
  if [[ $APPLY -eq 1 ]]; then warn "MOD REAL: modificările se aplică."
  else info "MOD PROBĂ: nu se modifică nimic. Rulați din nou cu --apply ca să aplicați."; fi
}

# Apel către Management API Supabase (cere SUPABASE_ACCESS_TOKEN, din
# supabase.com/dashboard/account/tokens).
sb_api() {
  local method="$1" path="$2"; shift 2
  curl -fsS -X "$method" "$SUPABASE_API$path" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" "$@"
}

# Cel mai recent instantaneu făcut de 01-snapshot.sh.
latest_snapshot() {
  local d
  d="$(ls -1d "$SNAPSHOT_ROOT"/snapshot-* 2>/dev/null | sort | tail -n1 || true)"
  [[ -n "$d" ]] || die "Nu există niciun instantaneu în $SNAPSHOT_ROOT. Rulați întâi 01-snapshot.sh."
  echo "$d"
}

pages_url_for() { # owner repo → adresa GitHub Pages
  local owner="${1,,}" repo="$2"
  if [[ "$repo" == "$owner.github.io" ]]; then echo "https://$owner.github.io/"; else echo "https://$owner.github.io/$repo/"; fi
}
