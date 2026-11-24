#!/usr/bin/env bash
# VARIANTA B (doar dacă transferul de proiect Supabase NU e posibil, de ex. altă regiune
# dorită sau organizația medicului e pe alt cont fără acces comun).
#
# Copiază proiectul vechi într-un proiect nou, creat de medic, cu procedura oficială
# Supabase „Backup and restore using the CLI”: roluri + schemă + date (inclusiv
# utilizatorii din auth), într-o singură tranzacție. Apoi compară numărul de rânduri.
#
# Proiectul nou trebuie să fie GOL (proaspăt creat). Dacă restaurarea eșuează la
# jumătate, tranzacția se anulează și proiectul nou rămâne gol.
#
# Necesită: supabase CLI, psql. Variabile:
#   SUPABASE_DB_URL      — baza VECHE (Session pooler)
#   NEW_SUPABASE_DB_URL  — baza NOUĂ  (Session pooler, din proiectul medicului)
#
# Folosire: ./alt-supabase-clone.sh [--apply]
# După: 03-github-after.sh cu NEW_SUPABASE_URL / NEW_SUPABASE_ANON_KEY, apoi
#       05-supabase-auth-urls.sh și 06-smoke-test.sh cu SUPABASE_REF=<ref nou>.
source "$(dirname "$0")/lib.sh"
need supabase psql
need_var SUPABASE_DB_URL NEW_SUPABASE_DB_URL
mode_banner

[[ "$SUPABASE_DB_URL" != "$NEW_SUPABASE_DB_URL" ]] || die "Baza veche și cea nouă sunt aceeași."

existing="$(psql "$NEW_SUPABASE_DB_URL" -At -c "select count(*) from information_schema.tables where table_schema='public'")"
[[ "$existing" == "0" ]] || die "Proiectul nou are deja $existing tabele în public. Folosiți un proiect proaspăt creat."
ok "Proiectul nou e gol."

ts="$(date -u +%Y%m%dT%H%M%SZ)"; out="$SNAPSHOT_ROOT/clone-$ts"; mkdir -p "$out"; chmod 700 "$out"
info "Export din baza veche în $out"
supabase db dump --db-url "$SUPABASE_DB_URL" -f "$out/roles.sql" --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" -f "$out/schema.sql"
supabase db dump --db-url "$SUPABASE_DB_URL" -f "$out/data.sql" --use-copy --data-only
psql "$SUPABASE_DB_URL" -At -v ON_ERROR_STOP=1 -f "$HERE/sql/row-counts.sql" > "$out/counts-old.txt"
chmod 600 "$out"/*

confirm_typed "COPIAZA" "Se scrie în baza NOUĂ (într-o singură tranzacție)."
# session_replication_role=replica: declanșatoarele (istoric, verificări) nu rulează
# la import, ca istoricul să nu se dubleze; datele intră exact cum erau.
run psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file "$out/roles.sql" --file "$out/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$out/data.sql" --dbname "$NEW_SUPABASE_DB_URL"

if [[ $APPLY -eq 1 ]]; then
  psql "$NEW_SUPABASE_DB_URL" -At -v ON_ERROR_STOP=1 -f "$HERE/sql/row-counts.sql" > "$out/counts-new.txt"
  if diff -u "$out/counts-old.txt" "$out/counts-new.txt"; then ok "Copie identică (număr de rânduri)."
  else die "Numărul de rânduri diferă (vezi diferența de mai sus). NU conectați aplicația la proiectul nou."; fi
  cat <<EOF

De făcut în proiectul nou (le face scriptul sau medicul în dashboard):
  * 05-supabase-auth-urls.sh cu SUPABASE_REF=<ref nou> (Site URL / Redirect URLs);
  * Authentication → Sign In / Providers: „Allow new users to sign up” OPRIT;
  * SMTP, dacă era configurat în cel vechi (vezi sb-auth.json din instantaneu);
  * Edge Functions, dacă erau publicate: supabase functions deploy … (README, pasul 4).
Proiectul vechi rămâne neatins până la confirmarea medicului (rollback = variabilele vechi).
EOF
fi
