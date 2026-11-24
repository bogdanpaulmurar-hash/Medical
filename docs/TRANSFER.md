# Transferul Vademecum MFR în conturile medicului

Checklist pas cu pas pentru mutarea aplicației (GitHub, Supabase, Claude) din conturile lui Bogdan în conturile medicului, **folosind funcțiile oficiale de transfer** ale fiecărei platforme. Nimic nu se recreează de mână: repo-ul și proiectul Supabase se *mută* cu tot cu istoric, date, adresă și chei.

Scripturile sunt în [`scripts/transfer/`](../scripts/transfer/). Toate rulează implicit în **mod probă** (arată ce ar face, fără să schimbe nimic). Modificările reale cer `--apply` și, la pașii care nu se pot anula ușor, tastarea unei confirmări.

**Legendă**

| Marcaj | Cine | Ce înseamnă |
|---|---|---|
| 🤖 | script | rulează automat, verifică singur rezultatul |
| 👤 MEDIC | medicul, în browser | acțiune de owner pe care doar el o poate face (cont nou, invitație, aprobare) |
| 👤 BOGDAN | Bogdan, în browser | acțiune de owner din dashboard, fără echivalent sigur prin API |
| ⚠️ | — | pas care nu se poate anula singur; are rollback descris mai jos |

---

## Pe scurt: ce se mută și ce se schimbă

| Componentă | Cum se mută | Ce se schimbă după |
|---|---|---|
| Cod, istoric, ramuri (`main`, `test`), PR-uri, workflow-uri, reguli | GitHub *Transfer repository* (API) | adresa repo-ului (GitHub face redirect automat) |
| Variabile Actions (`VITE_SUPABASE_*`, `TEST_SUPABASE_*`) | se verifică și se refac din instantaneu | nimic |
| Site-ul (GitHub Pages) | se republică automat din repo-ul mutat | **adresa**: `https://<org-medic>.github.io/Medical/` (Pages nu face redirect) |
| Baza de date Supabase „MedSlot Prod” (`yuqggvokpnqrpgizmgnw`, eu-west-1) | Supabase *Transfer project* (un clic) | nimic: aceeași adresă, aceleași chei, aceleași date |
| Adresa aplicației în Supabase Auth (linkurile din emailuri) | Management API (script) | Site URL / Redirect URLs → adresa nouă |
| Proiectul Claude | **nu se poate transfera**: proiect nou + `docs/CONTEXT.md` | conversațiile vechi rămân la Bogdan |

**Starea la 24.11.2026 (verificată):** Supabase are migrările 0001–0006 aplicate, catalogul încărcat (7 cabinete, 56 aparate, 44 proceduri), **0 utilizatori, 0 pacienți, 0 programări**. Aplicația rulează încă în mod demo (variabilele `VITE_SUPABASE_*` nu sunt setate). Asta face transferul acum aproape fără risc: nu există date reale de pierdut. **Momentul ideal e înainte de punerea în folosință reală.**

---

## Faza 0 — Pregătire (o singură dată)

### 0.1 👤 MEDIC — conturi și organizații

1. **GitHub**: cont personal pe github.com (dacă nu are), apoi **o organizație gratuită** (github.com → + → *New organization* → *Free*), de exemplu `vademecum-mfr`. Recomandăm organizație în loc de cont personal: transferul e imediat (nu cere acceptare din email), iar mai târziu se pot adăuga/scoate colegi fără să se atingă contul personal al medicului.
2. În organizație: *People* → *Invite member* → contul lui Bogdan, rol **Owner** (temporar; se scoate în Faza 5). Bogdan acceptă invitația.
3. **Supabase**: cont pe supabase.com cu emailul medicului → creează o **organizație** (plan Free merge pentru început; pentru date medicale reale se recomandă **Pro**: backup zilnic, fără pauză automată).
4. În organizația Supabase: *Team* → *Invite* → emailul lui Bogdan, rol **Owner** (temporar). Bogdan acceptă.
5. **Claude**: cont pe claude.ai (plan Pro sau mai mare, ca să aibă proiecte și Claude Code). Detalii în Faza 6.

> **Numele repo-ului îl alege medicul.** Implicit rămâne `Medical`, dar în transfer.env se poate pune alt nume (`REPO_NAME`, de ex. `vademecum-mfr`); transferul îl redenumește în același pas și adresa site-ului devine `https://<org>.github.io/<nume>/`. Dacă repo-ul se numește exact `<org>.github.io`, site-ul stă direct la `https://<org>.github.io/`. Aplicația merge la orice adresă (folosește căi relative). La rollback, repo-ul revine cu numele vechi.

> De notat pentru transfer.env: numele organizației GitHub (`DST_OWNER`), numele repo-ului dorit (`REPO_NAME`) și slug-ul organizației Supabase (`DST_SUPABASE_ORG_SLUG`, se vede în adresa `supabase.com/dashboard/org/<slug>`).

### 0.2 🤖 BOGDAN — uneltele, pe calculatorul de pe care se rulează

```bash
# o dată: gh (GitHub CLI), jq, curl, psql; opțional supabase CLI (pentru copia bazei)
gh auth login                      # cu contul bogdanpaulmurar-hash
cd Medical/scripts/transfer
cp transfer.env.example transfer.env   # completați DST_OWNER, DST_SUPABASE_ORG_SLUG, SUPABASE_ACCESS_TOKEN
```

`SUPABASE_ACCESS_TOKEN`: supabase.com/dashboard/account/tokens → *Generate new token*. Se șterge după transfer. `transfer.env` e ignorat de git.

### 0.3 👤 BOGDAN — verificări rapide în dashboard (cer ochi, nu se pot citi sigur prin API)

- Supabase → proiectul → *Integrations*: **nu** e conectată integrarea GitHub (condiție Supabase pentru transfer).
- Supabase → proiectul → *Log drains*: niciunul.
- Proiectul nu e pus pe pauză (dacă e, *Restore*).

---

## Faza 1 — Instantaneu și copie de siguranță 🤖

```bash
./01-snapshot.sh
```

Doar citește. Salvează în `~/vademecum-transfer/snapshot-<dată>/` (în afara repo-ului, cu acces doar pentru utilizatorul curent):

- setările repo-ului, **valorile** variabilelor Actions, Pages, mediile, ramurile, regulile, colaboratorii;
- o copie git completă (`repo-mirror.git`, toate ramurile);
- proiectul Supabase, configurarea Auth (Site URL, Redirect URLs, înscriere dezactivată), Edge Functions, numele secretelor;
- cu `SUPABASE_DB_URL` setat: copia bazei (roluri, schemă, date) după procedura oficială Supabase și numărul de rânduri pe tabel.

Acest instantaneu e sursa pentru refacerea automată din Faza 2 și pentru rollback. **Nu continuați dacă scriptul se oprește cu ✗.**

---

## Faza 2 — GitHub

### 2.1 🤖 ⚠️ Transferul repo-ului

```bash
./02-github-transfer.sh            # probă: verifică tot și arată planul
./02-github-transfer.sh --apply    # transferul real; cereți să tastați <org>/Medical
```

Scriptul verifică înainte: instantaneu de azi, Bogdan e admin pe repo, organizația există, Bogdan e Owner activ în ea, nu există deja un repo cu același nume. Apoi folosește API-ul oficial `POST /repos/{owner}/{repo}/transfer` și așteaptă să apară repo-ul la noua adresă.

Se mută cu repo-ul: codul, toate ramurile, issue-urile, PR-urile, workflow-urile, regulile. Git și link-urile `github.com/bogdanpaulmurar-hash/Medical` fac redirect automat.

> Dacă `DST_OWNER` e un cont personal în loc de organizație, medicul primește un email și trebuie să **accepte** transferul în 24 de ore (👤 MEDIC).

### 2.2 🤖 Refacerea setărilor și republicarea

```bash
./03-github-after.sh               # probă: arată ce diferă
./03-github-after.sh --apply
```

Idempotent (se poate rula de mai multe ori). Verifică Actions activ, readuce variabilele Actions din instantaneu (doar pe cele care diferă), setează Pages pe *GitHub Actions*, pornește `pages.yml` și așteaptă să se termine. Scrie noua adresă a site-ului în instantaneu.

### 2.3 👤 MEDIC — aplicația Claude pe GitHub

github.com/apps/claude → *Install* → organizația medicului → repo-ul `Medical`. Fără asta, proiectul Claude nou nu poate lucra pe repo. (Bogdan își pierde accesul Claude la repo când pleacă din organizație, ceea ce e intenționat.)

---

## Faza 3 — Supabase

### 3.1 🤖 Verificare de eligibilitate

```bash
./04-supabase-transfer.sh
```

Confirmă că Bogdan e membru în organizația medicului, că proiectul e activ și cere previzualizarea oficială a transferului (`POST /v2/projects/{ref}/transfers/previews`), salvată în instantaneu.

### 3.2 👤 BOGDAN ⚠️ — transferul proiectului (un clic)

supabase.com/dashboard/project/yuqggvokpnqrpgizmgnw/settings/general → **Transfer project** → organizația medicului → confirmare.

Condiții Supabase: Owner pe organizația sursă, membru în cea destinație, fără integrare GitHub, fără log drains. Organizația gratuită poate avea cel mult 2 proiecte gratuite. Mutarea între planuri plătite/gratuite poate da 1–2 minute de întrerupere (azi fără efect: aplicația nu e conectată).

### 3.3 🤖 Confirmare după transfer

```bash
./04-supabase-transfer.sh --verify
```

Verifică că proiectul e în organizația medicului, că ref-ul (deci adresa `https://yuqggvokpnqrpgizmgnw.supabase.co`) e același și că cheia anon nu s-a schimbat, deci variabilele GitHub rămân valabile.

### 3.4 🤖 Adresa nouă în Supabase Auth

```bash
./05-supabase-auth-urls.sh
./05-supabase-auth-urls.sh --apply
```

Pune Site URL = noua adresă Pages și adaugă la Redirect URLs adresa nouă și `/test/`. Adresele vechi rămân în listă până la curățenia din Faza 5 (permit rollback). Fără asta, linkurile din emailurile de invitație/resetare ar duce la adresa veche.

### Varianta B (doar dacă transferul de proiect nu e posibil)

Exemple: medicul vrea altă regiune, sau Supabase refuză transferul. Medicul creează un proiect **nou, gol** (regiune UE) și:

```bash
NEW_SUPABASE_DB_URL='<Session pooler din proiectul nou>' ./alt-supabase-clone.sh --apply
NEW_SUPABASE_URL=https://<ref-nou>.supabase.co NEW_SUPABASE_ANON_KEY=<anon nou> ./03-github-after.sh --apply
SUPABASE_REF=<ref-nou> ./05-supabase-auth-urls.sh --apply
SUPABASE_REF=<ref-nou> ./06-smoke-test.sh
```

Copia folosește procedura oficială Supabase (roluri + schemă + date, inclusiv utilizatorii) într-o singură tranzacție și compară numărul de rânduri. Proiectul vechi rămâne neatins până la confirmare. Setări de refăcut în dashboard-ul nou (👤 MEDIC): *Allow new users to sign up* oprit, SMTP (dacă exista), Edge Functions (dacă erau publicate; azi nu sunt).

---

## Faza 4 — Verificare (smoke test) 🤖

```bash
./06-smoke-test.sh
```

Doar citește. Verifică: site-ul nou răspunde și e Vademecum MFR (aplicația reală și `/test/`); ce backend are în cod (proiectul așteptat sau mod demo); Supabase Auth răspunde; un vizitator neautentificat nu vede date (RLS); cu `SUPABASE_DB_URL`, același număr de rânduri ca în instantaneu și migrarea 0006 prezentă; ultima publicare Pages a reușit. Se oprește cu cod de eroare dacă ceva nu trece.

Apoi, 👤 MEDIC: deschide adresa nouă pe calculator și pe telefon.

> **Notă despre datele demo:** datele introduse în modul demo stau în browser, legate de adresă. La adresa nouă, modul demo pornește de la zero. Sunt date fictive, deci nu se pierde nimic real.

---

## Faza 5 — Predarea controlului (după câteva zile fără probleme)

Până aici, Bogdan rămâne Owner peste tot, ca rollback-ul să fie posibil. Când medicul confirmă că totul merge:

1. 👤 MEDIC — **Supabase → Project Settings → Database → Reset database password** (parola veche a fost la Bogdan). Dacă Bogdan a avut cheia *service_role* / *secret*: *API Keys* → rotire. **Atenție:** rotirea cheii *anon* schimbă cheia publică; atunci rulați `NEW_SUPABASE_ANON_KEY=<cheia nouă> ./03-github-after.sh --apply`.
2. 👤 MEDIC — Supabase → organizație → *Team*: Bogdan scos sau trecut pe *Developer* (dacă mai lucrează la aplicație).
3. 👤 MEDIC — GitHub → organizație → *People*: Bogdan scos din Owners. Dacă mai lucrează la aplicație: repo → *Settings → Collaborators* → Bogdan cu rol *Write*.
4. 🤖 Curățenie: `./05-supabase-auth-urls.sh` nu șterge adresele vechi; medicul le scoate din *Authentication → URL Configuration* sau o cere proiectului Claude nou.
5. 👤 BOGDAN — șterge `SUPABASE_ACCESS_TOKEN` (supabase.com/dashboard/account/tokens) și `transfer.env`. Instantaneul cu copia bazei se șterge sau se predă medicului.
6. Actualizați linkul trimis personalului (adresa nouă).

---

## Faza 6 — Claude (proiect nou)

Conversațiile, memoria și fișierele unui proiect Claude **nu se pot transfera** între conturi. Ce se poate transfera e contextul, iar el e scris în [`docs/CONTEXT.md`](CONTEXT.md) (în repo, deci se mută automat cu el).

1. 👤 MEDIC — claude.ai → proiect nou (de ex. „Vademecum MFR”), cu repo-ul `<org>/Medical` conectat (după pasul 2.3).
2. 👤 MEDIC — la instrucțiunile proiectului: „Citește docs/CONTEXT.md înainte de orice lucru.” (sau lipește conținutul fișierului).
3. 👤 BOGDAN — capturile de ecran din fișierele proiectului vechi (folderul `medslot/`) se descarcă și se încarcă în proiectul nou, dacă sunt utile. Nu conțin date de pacienți.
4. Prima cerere în proiectul nou: „Rulează `scripts/transfer/06-smoke-test.sh` și confirmă starea din CONTEXT.md.”

---

## Rollback

| Situație | Ce faceți |
|---|---|
| Ceva nu merge după Faza 2 | `./09-rollback.sh` (probă), apoi `./09-rollback.sh --apply`: transferă repo-ul înapoi cu același API, readuce variabilele și Pages din instantaneu, republică. Bogdan trebuie să fie încă Owner în organizația medicului. Dacă repo-ul se întoarce în contul personal al lui Bogdan, transferul cere acceptarea lui din email. |
| Ceva nu merge după Faza 3 (varianta A) | 👤 MEDIC: același *Transfer project* înapoi spre organizația lui Bogdan (Bogdan rămâne membru). Adresa și cheile nu se schimbă, aplicația nu trebuie atinsă. Apoi `APP_URL=<adresa veche> ./05-supabase-auth-urls.sh --apply`. |
| Varianta B nu merge | Proiectul vechi e neatins: `./03-github-after.sh --apply` **fără** `NEW_SUPABASE_*` readuce variabilele vechi și republică. |
| Repo-ul s-a pierdut / șters din greșeală | `repo-mirror.git` din instantaneu: `git push --mirror https://github.com/<owner>/Medical.git` într-un repo nou gol, apoi `03-github-after.sh --apply`. |
| Datele din bază s-au stricat | fișierele `db-*.sql` din instantaneu, restaurate cu procedura Supabase *Backup and restore using the CLI* (aceeași comandă ca în `alt-supabase-clone.sh`). |

Recomandare: faceți Fazele 1–4 într-o singură ședință (aprox. 30 de minute), cu medicul disponibil pentru invitații, și Faza 5 după câteva zile.
