# Context pentru Claude: Vademecum MFR

Acest fișier ține locul istoricului de conversații, care nu se poate transfera între conturi Claude. Un proiect Claude nou trebuie să-l citească înainte de orice lucru și să-l actualizeze când se schimbă ceva important (decizii, stare, pași rămași). Stare la **24.11.2026, versiunea 4.9**.

## Ce este

Aplicație web (PWA, română + engleză) pentru secția de **recuperare medicală (MFR), Cluj**: programarea procedurilor pe aparate și ghidurile medicale ale secției (Vademecum). A pornit ca „MedSlot” și a fost redenumită „Vademecum MFR”. Medicul care a cerut-o folosea două unelte HTML proprii offline („Vademecum MFR 3.0” pentru medici, „Programări MFR 5” pentru programări), cu date doar în browser și transfer manual prin Export/Import JSON. Aplicația aduce peste ele: **date comune în cloud, utilizatori cu roluri și istoric complet al modificărilor**.

## Tehnic

- **Frontend:** React 19 + TypeScript + Vite, CSS simplu, fără framework de UI. `npm run dev` pornește în **mod demo** (date fictive în localStorage) când lipsesc `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (vezi `src/state.tsx`).
- **Backend:** Supabase în UE (proiect „MedSlot Prod”, ref `yuqggvokpnqrpgizmgnw`, eu-west-1): Postgres cu RLS, Auth, Edge Functions `invite-user` și `notify` (în `supabase/functions`, **încă nepublicate**).
- **Migrări** (`supabase/migrations`): 0001 init (profiluri, cabinete, saloane/aparate, proceduri, programări, istoric), 0002 pacienți + plan + capacitate, 0003 catalogul MFR (7 cabinete, 56 aparate, 44 proceduri), 0004 documente la pacient (doar medici, cu retenție), 0005 întărire securitate, 0006 suprapunere permisă (`overlap_ok`). **Toate șase sunt aplicate** pe proiectul de producție (verificat 24.11.2026). Teste SQL în `supabase/tests`.
- **Găzduire:** GitHub Pages prin `.github/workflows/pages.yml` (rulează mereu din `main`). Ramura `test` se publică la `/test/` cu bandou albastru (declanșată de `test-trigger.yml`); backend de test prin variabilele `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY`, altfel demo. Cheile din localStorage ale versiunii de test au sufixul `-test`.
- **Versiunea** se crește manual în `vite.config.ts` (`release`) și în `package.json`.

## Funcționalități (pe scurt)

Programări pe calendar (zi/săptămână/lună), conflicte verificate de bază (medic, pacient, capacitatea aparatului), propunere de oră liberă, suprapunere permisă la cerere (afișată cu altă culoare); pacienți (cod + inițiale) cu **plan de proceduri** construit de medic, din care programează persoana de la programări; Ghiduri (patologii, aparate, orteze), 54 de scale, Examen obiectiv, ISNCSCI, Bilet de ieșire, Referate (A16, A5, handicap, A39B), fișa de tratament (și în formatul spitalului, beta), tipărituri în română cu engleză opțională; Setări (catalog, utilizatori și roluri, retenție) și asistentul „Pregătire pentru utilizare reală”; Instrucțiuni RO/EN.

## Decizii luate (nu le redeschideți fără motiv)

- O singură aplicație pentru medici și programări (nu două), cu roluri: administrator, medic curant, persoană programări, medic primitor.
- **Autentificare cu email + parolă**; link pe email doar la prima invitație și la resetare. Fără deconectare automată. Utilizatorii se adaugă de administrator din Setări, nu din cod. Înscriere liberă dezactivată.
- Oricine activ poate edita, dar totul intră în istoric (cine / ce / când), care nu se poate șterge.
- Pacient = cod + inițiale; nume și diagnostic opționale. **Repo-ul nu conține și nu are voie să conțină date reale de pacienți.** Lista medicilor cu nume/parafe din HTML-urile medicului nu se pune în repo (repo-ul e public).
- Textul referatelor rămâne doar în română.
- Notificări pe email; SMS doar ca opțiune, dezactivat (cost). Expeditorul emailurilor: o adresă generică, încă de ales. Infrastructura spitalului nu se atinge.
- Google Drive respins pentru stocare (GDPR, fără tranzacții).
- Logica de 13.000 de linii din HTML-urile medicului **nu** se rescrie integral; se preia ce aduce valoare în varianta cu date comune.
- Proces: modificările merg întâi pe ramura `test`, medicul verifică linkul `/test/`, apoi `test` → `main`.

## Stare

- Aplicația e publică în **mod demo** (date fictive). Baza de producție are doar catalogul: **0 utilizatori, 0 pacienți, 0 programări**.
- Se așteaptă ca medicul să testeze demo-ul și să decidă continuarea.
- Transferul în conturile medicului (GitHub, Supabase, Claude) e descris în [`docs/TRANSFER.md`](TRANSFER.md), cu scripturi în `scripts/transfer/`. După transfer, adresa site-ului devine `https://<organizația-medicului>.github.io/Medical/`.

## Pași rămași pentru punerea în folosință reală

1. Publicarea Edge Function `invite-user` (și `notify`, cu secretele ei; README, pasul 4).
2. Variabilele GitHub `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY` → aplicația trece din demo pe baza reală.
3. Primul administrator (README, pasul 2), apoi restul echipei din Setări.
4. Alegerea expeditorului de email + SMTP propriu (SMTP-ul implicit Supabase are limită mică).
5. Test complet cu baza reală: autentificare cu parolă, căutare, istoric, capacitate.
6. Opțional: proiect Supabase separat pentru `/test/` (variabilele `TEST_SUPABASE_*`).

## Goluri cunoscute

- Butoanele din plan folosesc o corespondență simplificată a procedurilor.
- Din Examen obiectiv lipsesc testele adăugate de utilizator și două unelte speciale (proceduri fizicale, metastaze).
- Rezultatele scalelor și ale examenului nu se leagă încă de pacient.
- Unele durate de proceduri sunt puse implicit la 30 de minute: de confirmat cu medicul.
- Restricția ca persoana de la programări să nu editeze pacientul e doar în interfață, nu și în politicile bazei.

## Cum se lucrează

- Comunicarea cu proprietarul e în **română**, simplu, fără jargon.
- Fiecare versiune: crește `release` în `vite.config.ts` și `package.json`, actualizează Instrucțiunile din aplicație dacă se schimbă ceva vizibil.
- Migrările noi: fișier nou numerotat în `supabase/migrations` + test în `supabase/tests`; pe producție se aplică doar cu acordul proprietarului.
- Înainte de a raporta o stare, verificați-o (baza, site-ul): rulați `scripts/transfer/06-smoke-test.sh`.
