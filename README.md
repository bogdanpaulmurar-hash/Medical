<p align="center"><img src="public/icon.svg" width="96" alt="MedSlot"></p>

# MedSlot

**RO:** Aplicație web (responsive + PWA) pentru programarea procedurilor medicale într-o clinică cu o singură locație, mai multe cabinete și saloane, pentru o echipă mică (~10 utilizatori).
**EN:** Web app (responsive + installable PWA) for scheduling medical procedures in a single-site clinic with several offices and rooms, for a small team (~10 users).

> ⚠️ Repo-ul nu conține și nu trebuie să conțină date reale despre pacienți. Toate datele demo sunt fictive.
> The repository does not and must not contain real patient data. All demo data is fictitious.

---

## Funcționalități / Features

| RO | EN |
|---|---|
| Autentificare cu link magic pe email (fără parolă), doar pentru persoane invitate | Email magic-link sign-in (no password), invited people only |
| Roluri: administrator, medic curant, persoană programări, medic primitor | Roles: administrator, attending doctor, scheduler, receiving doctor |
| Oricine activ poate edita; **istoric complet** (cine / ce / când, valoare veche → nouă), imposibil de șters | Any active user can edit; **full change history** (who / what / when, old → new), cannot be deleted |
| Pacient identificat prin **cod + inițiale**; nume, diagnostic, note opționale | Patient identified by **code + initials**; name, diagnosis, notes optional |
| Procedură, dată/oră, durată, cabinet/salon, medic curant, medic primitor, status | Procedure, date/time, duration, office/room, attending, receiving doctor, status |
| **Verificare conflicte** salon / medic, în timp real în formular și garantată de baza de date | **Conflict check** for room / doctor, live in the form and enforced by the database |
| Cabinete, saloane, proceduri editabile din Setări (se dezactivează, nu se șterg) | Offices, rooms, procedures editable in Settings (deactivated, never deleted) |
| Notificări email; SMS opțional, **dezactivat implicit** (cost per mesaj) | Email notifications; optional SMS, **off by default** (costs per message) |
| Temă luminoasă / întunecată, mărime text reglabilă, RO / EN | Light / dark theme, adjustable text size, RO / EN |
| Pagină de instrucțiuni în română și engleză | Instructions page in Romanian and English |
| Actualizare în timp real: toți văd aceleași programări | Real-time updates: everyone sees the same schedule |

## Încercare rapidă (mod demo) / Quick try (demo mode)

```bash
npm install
npm run dev
```

Fără fișier `.env.local`, aplicația pornește în **mod demo**: alegeți un utilizator fictiv; datele stau doar în browser.
Without `.env.local` the app starts in **demo mode**: pick a fake user; data stays in the browser only.

---

## Arhitectură / Architecture

```
 Telefon / PC (PWA)            Supabase (regiunea UE, ex. Frankfurt)
 ┌──────────────────┐  HTTPS   ┌──────────────────────────────────────────┐
 │ React + Vite     │ ───────► │ Auth (link magic, doar invitați)         │
 │ (fișiere statice │          │ Postgres + Row Level Security            │
 │  pe Netlify /    │ ◄─────── │   • constrângeri EXCLUDE (conflicte)     │
 │  Cloudflare etc.)│ realtime │   • triggere audit_log (istoric)         │
 └──────────────────┘          │ Edge Functions                           │
                               │   • notify  → email (Resend) / SMS stub  │
                               │   • invite-user (doar admin)             │
                               └──────────────────────────────────────────┘
```

* **Frontend:** React 19 + TypeScript + Vite, fără framework de UI (CSS simplu, ușor de modificat). PWA cu service worker care **nu** salvează date despre pacienți, doar fișierele aplicației.
* **Backend:** [Supabase](https://supabase.com) găzduit în **UE**: Postgres gestionat, autentificare, realtime, funcții serverless. Nu e nevoie de server propriu.
* **Securitate în baza de date, nu doar în aplicație:**
  * RLS pe toate tabelele: doar utilizatorii activi văd ceva; anonimii nimic.
  * `audit_log` e scris de trigger `security definer`; nu există politici de insert/update/delete, deci nimeni nu îl poate modifica din aplicație.
  * Programările nu se pot șterge (fără politică DELETE); se anulează.
  * Rolul / statusul unui cont îl poate schimba doar administratorul (trigger).
  * Setările clinicii (inclusiv activarea SMS) doar administratorul.
* **Conflicte:** constrângeri `EXCLUDE USING gist` pe `(salon, interval)`, `(medic curant, interval)`, `(medic primitor, interval)`; programările anulate / neprezentate nu blochează. Formularul arată conflictul înainte de salvare.

### De ce nu Google Drive? / Why not Google Drive?

**RO:** Google Drive (fișier Sheets/Excel) nu are tranzacții (doi oameni pot programa același salon simultan), nu are control de acces pe rânduri, nu are un jurnal de modificări de încredere și pune date medicale (categorie specială GDPR, art. 9) într-un spațiu de fișiere personal. O bază de date gestionată în UE rezolvă toate acestea și costă 0–25 $/lună la această dimensiune.

**EN:** Google Drive (a Sheets/Excel file) has no transactions (two people can book the same room at once), no row-level access control, no trustworthy change log, and puts health data (GDPR art. 9 special category) in a personal file space. A managed EU database solves all of these and costs $0–25/month at this size.

### Date și GDPR / Data and GDPR

* **Minimizare:** cod + inițiale obligatorii; nume / diagnostic opționale și ascunse implicit în formular.
* **Notificări:** emailul / SMS-ul conține doar cod, inițiale, procedură, oră, salon. Niciodată nume sau diagnostic.
* **Criptare:** în tranzit (TLS) și la stocare (AES-256, implicit în Supabase). Backup zilnic inclus.
* **Localizare:** alegeți regiunea UE la crearea proiectului (ex. `eu-central-1` Frankfurt).
* **De făcut de clinică:** acord de prelucrare date (DPA) cu Supabase (disponibil în dashboard), registrul de prelucrări, informarea pacienților, politica de retenție. Pentru date medicale, planul **Pro** (backup point-in-time, fără pauză automată) este recomandat.

---

## Deploy pas cu pas / Step-by-step deployment

### 1. Supabase (baza de date) / Supabase (database)

1. Creați cont pe [supabase.com](https://supabase.com) → **New project** → **Region: Central EU (Frankfurt)**. Notați parola bazei de date.
2. **SQL Editor** → lipiți și rulați `supabase/migrations/0001_init.sql`.
3. (Opțional) rulați `supabase/seed.sql` pentru cabinete / saloane / proceduri de început (fictive, le puteți redenumi din Setări).
4. **Authentication → Providers → Email**: activ. **Authentication → Sign In / Providers**: dezactivați **Allow new users to sign up** (doar invitați).
5. **Authentication → URL Configuration**: *Site URL* = adresa aplicației (pasul 3), adăugați-o și la *Redirect URLs*.
6. **Authentication → SMTP Settings**: configurați un SMTP propriu (ex. Resend, Brevo) — SMTP-ul implicit Supabase are limită foarte mică de emailuri pe oră.
7. **Project Settings → API**: copiați *Project URL* și cheia *anon public*.

### 2. Primul administrator / First administrator

1. **Authentication → Users → Invite user** cu emailul medicului.
2. În **SQL Editor**:
   ```sql
   update public.profiles set role = 'admin', full_name = 'Dr. …' where email = 'medic@exemplu.ro';
   ```
3. De aici, administratorul invită restul echipei din **Setări → Utilizatori și roluri** (după pasul 4).

### 3. Frontend (găzduire statică gratuită) / Frontend (free static hosting)

Orice găzduire statică merge. Exemplu **Netlify** (sau Cloudflare Pages / Vercel, identic):

1. Conectați repo-ul GitHub. Build command: `npm run build`, publish directory: `dist`.
2. Variabile de mediu: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (din pasul 1.7).
3. Deploy. Puneți adresa obținută în Supabase la pasul 1.5.

Cheia *anon* e publică prin design; securitatea vine din RLS. **Nu** puneți niciodată cheia *service_role* în frontend.

### 4. Funcții (invitații + notificări) / Functions (invites + notifications)

Necesită [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase functions deploy invite-user
supabase functions deploy notify --no-verify-jwt
supabase secrets set APP_URL=https://adresa-aplicatiei.ro \
  WEBHOOK_SECRET=<un-secret-lung-aleator> \
  RESEND_API_KEY=<cheie-resend> \
  MAIL_FROM="MedSlot <programari@domeniul-clinicii.ro>"
```

Apoi **Database → Webhooks → Create**: tabela `appointments`, evenimente *Insert* + *Update*, tip *Supabase Edge Function* → `notify`, header `x-webhook-secret: <același secret>`.

### 5. SMS (opțional, cu cost) / SMS (optional, paid)

Implicit SMS-ul e un **stub** (nu trimite nimic). Pentru trimitere reală:

```bash
supabase secrets set SMS_PROVIDER=twilio TWILIO_ACCOUNT_SID=… TWILIO_AUTH_TOKEN=… TWILIO_FROM=+40…
```

Apoi administratorul bifează **Setări → Notificări SMS active**, iar fiecare utilizator își pune telefonul și bifează SMS. Alt furnizor (ex. SMSLink.ro, SMSAPI): implementați interfața `SmsProvider` din `supabase/functions/_shared/sms.ts`.

### Cost estimat / Estimated cost

| | Gratuit / Free | Recomandat / Recommended |
|---|---|---|
| Supabase | Free (proiect se pune pe pauză după 7 zile de inactivitate) | Pro ~25 $/lună |
| Netlify / Cloudflare Pages | 0 | 0 |
| Email (Resend) | 0 (3.000/lună) | 0 |
| SMS | — | ~0,04–0,08 € / mesaj |

---

## Dezvoltare / Development

```bash
npm run dev        # server local (demo sau Supabase dacă există .env.local)
npm run build      # verificare tipuri + build producție
```

Test local al schemei (Postgres simplu, schema `auth` simulată): vedeți `supabase/tests/behaviour.sql` — verifică RLS, conflictele, istoricul și protecția rolurilor.

### Structură / Layout

```
public/                 icoane, manifest PWA, service worker
src/
  data/api.ts           interfața de date + verificare conflicte
  data/supabaseApi.ts   implementarea Supabase
  data/demoApi.ts       mod demo (localStorage, date fictive)
  components/           Programări, formular, Istoric, Setări, Instrucțiuni, Login
  i18n.ts               texte RO / EN
  state.tsx             context, preferințe (temă, font, limbă)
supabase/
  migrations/0001_init.sql   schemă, RLS, audit, conflicte
  functions/notify           email + SMS (stub)
  functions/invite-user      invitații (doar admin)
  seed.sql                   nomenclatoare fictive
```
