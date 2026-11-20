-- =====================================================================
-- Programări proceduri medicale / Medical procedure scheduling
-- Schema inițială pentru Supabase (Postgres 15+).
--
-- Principii:
--   * minimizarea datelor: pacientul e identificat prin cod + inițiale;
--     numele și diagnosticul sunt opționale;
--   * orice utilizator activ poate edita, dar fiecare modificare este
--     scrisă de trigger în audit_log (cine / ce / când) și nu poate fi
--     ștearsă sau modificată din aplicație;
--   * conflictele (același salon sau același medic în același interval)
--     sunt blocate în baza de date prin constrângeri EXCLUDE;
--   * row-level security pe toate tabelele.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Tipuri
-- ---------------------------------------------------------------------
create type public.user_role as enum (
  'admin',            -- administrator (gestionează utilizatori și setări)
  'attending',        -- medic curant
  'scheduler',        -- persoană programări
  'receiving'         -- medic primitor
);

create type public.appointment_status as enum (
  'planned',          -- programat
  'confirmed',        -- confirmat
  'in_progress',      -- în desfășurare
  'done',             -- efectuat
  'cancelled',        -- anulat
  'no_show'           -- neprezentat
);

-- ---------------------------------------------------------------------
-- Profiluri utilizatori (1:1 cu auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null unique,
  full_name     text not null default '',
  role          public.user_role not null default 'scheduler',
  active        boolean not null default true,
  phone         text,                          -- doar pentru SMS opțional
  notify_email  boolean not null default true,
  notify_sms    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- La crearea unui cont (invitație), se creează automat profilul.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'scheduler')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Funcții ajutătoare pentru RLS (security definer ca să nu intre în recursie)
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Nomenclatoare: cabinete, saloane, proceduri
-- ---------------------------------------------------------------------
create table public.cabinets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.rooms (
  id          uuid primary key default gen_random_uuid(),
  cabinet_id  uuid not null references public.cabinets (id) on delete restrict,
  name        text not null,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (cabinet_id, name)
);

create table public.procedures (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  default_duration  int not null default 30 check (default_duration between 5 and 720),
  active            boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Setări aplicație (un singur rând)
-- ---------------------------------------------------------------------
create table public.app_settings (
  id             int primary key default 1 check (id = 1),
  clinic_name    text not null default 'Clinica',
  email_enabled  boolean not null default true,
  -- SMS are cost per mesaj: dezactivat implicit.
  sms_enabled    boolean not null default false,
  updated_at     timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------
-- Programări
-- ---------------------------------------------------------------------
create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  patient_code      text not null check (length(patient_code) between 1 and 32),
  patient_initials  text not null check (length(patient_initials) between 1 and 8),
  patient_name      text,          -- opțional
  diagnosis         text,          -- opțional
  notes             text,          -- opțional
  procedure_id      uuid not null references public.procedures (id) on delete restrict,
  room_id           uuid not null references public.rooms (id) on delete restrict,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  attending_id      uuid not null references public.profiles (id) on delete restrict,
  receiving_id      uuid references public.profiles (id) on delete restrict,
  status            public.appointment_status not null default 'planned',
  created_by        uuid references public.profiles (id) default auth.uid(),
  updated_by        uuid references public.profiles (id) default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_at > starts_at),

  -- Conflicte: același salon în același interval (programările anulate /
  -- neprezentate nu blochează).
  constraint no_room_overlap exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show')),

  -- Același medic curant în același interval.
  constraint no_attending_overlap exclude using gist (
    attending_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show')),

  -- Același medic primitor în același interval.
  constraint no_receiving_overlap exclude using gist (
    receiving_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show') and receiving_id is not null)
);

create index appointments_starts_at_idx on public.appointments (starts_at);

-- updated_at / updated_by automat
create or replace function public.touch_row()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if tg_table_name = 'appointments' then
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    new.created_by := old.created_by;  -- nu poate fi rescris
  end if;
  return new;
end;
$$;

create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_row();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_row();
create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_row();

-- Un utilizator ne-admin nu își poate schimba singur rolul / statusul.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() null = consola SQL / service role (server): permis.
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.email is distinct from old.email then
      raise exception 'Doar administratorul poate schimba rolul, statusul sau emailul.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------
-- Istoric modificări (audit) — scris DOAR de trigger
-- ---------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   uuid,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by  uuid,                          -- auth.uid() la momentul modificării
  changed_by_email text,                     -- păstrat chiar dacă userul e șters
  changed_at  timestamptz not null default now(),
  old_data    jsonb,
  new_data    jsonb
);

create index audit_log_record_idx on public.audit_log (record_id, changed_at desc);
create index audit_log_changed_at_idx on public.audit_log (changed_at desc);

create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_old   jsonb;
  v_new   jsonb;
  v_id    uuid;
begin
  if v_uid is not null then
    select email into v_email from public.profiles where id = v_uid;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;

  -- Nu înregistra UPDATE-uri care nu schimbă nimic relevant.
  if tg_op = 'UPDATE'
     and (v_old - 'updated_at' - 'updated_by') = (v_new - 'updated_at' - 'updated_by') then
    return new;
  end if;

  v_id := coalesce((v_new ->> 'id'), (v_old ->> 'id'))::uuid;

  insert into public.audit_log (table_name, record_id, action, changed_by, changed_by_email, old_data, new_data)
  values (tg_table_name, v_id, tg_op, v_uid, v_email, v_old, v_new);

  return coalesce(new, old);
end;
$$;

create trigger audit_appointments after insert or update or delete on public.appointments
  for each row execute function public.write_audit();
create trigger audit_cabinets after insert or update or delete on public.cabinets
  for each row execute function public.write_audit();
create trigger audit_rooms after insert or update or delete on public.rooms
  for each row execute function public.write_audit();
create trigger audit_procedures after insert or update or delete on public.procedures
  for each row execute function public.write_audit();
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.write_audit();

-- app_settings are id int, nu uuid: audit separat simplu.
create or replace function public.write_settings_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (table_name, record_id, action, changed_by, changed_by_email, old_data, new_data)
  values ('app_settings', null, tg_op, auth.uid(),
          (select email from public.profiles where id = auth.uid()),
          to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

create trigger audit_app_settings after update on public.app_settings
  for each row execute function public.write_settings_audit();

-- ---------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.cabinets      enable row level security;
alter table public.rooms         enable row level security;
alter table public.procedures    enable row level security;
alter table public.app_settings  enable row level security;
alter table public.appointments  enable row level security;
alter table public.audit_log     enable row level security;

-- profiles: toți utilizatorii activi văd colegii; fiecare își editează
-- preferințele; adminul editează pe oricine.
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_active_user() or id = auth.uid());
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid() and public.is_active_user())
  with check (id = auth.uid());
create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Nomenclatoare: citire + editare pentru orice utilizator activ
-- („oricine poate edita, dar există istoric”). Ștergerea e înlocuită
-- de dezactivare (active = false) ca să nu se piardă istoricul.
create policy cabinets_select on public.cabinets for select to authenticated using (public.is_active_user());
create policy cabinets_insert on public.cabinets for insert to authenticated with check (public.is_active_user());
create policy cabinets_update on public.cabinets for update to authenticated using (public.is_active_user()) with check (public.is_active_user());

create policy rooms_select on public.rooms for select to authenticated using (public.is_active_user());
create policy rooms_insert on public.rooms for insert to authenticated with check (public.is_active_user());
create policy rooms_update on public.rooms for update to authenticated using (public.is_active_user()) with check (public.is_active_user());

create policy procedures_select on public.procedures for select to authenticated using (public.is_active_user());
create policy procedures_insert on public.procedures for insert to authenticated with check (public.is_active_user());
create policy procedures_update on public.procedures for update to authenticated using (public.is_active_user()) with check (public.is_active_user());

-- Setări: toți citesc, doar adminul modifică (SMS are cost).
create policy settings_select on public.app_settings for select to authenticated using (public.is_active_user());
create policy settings_update on public.app_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Programări: orice utilizator activ citește / creează / modifică.
-- Fără DELETE: o programare se anulează (status = cancelled).
create policy appointments_select on public.appointments for select to authenticated using (public.is_active_user());
create policy appointments_insert on public.appointments for insert to authenticated with check (public.is_active_user());
create policy appointments_update on public.appointments for update to authenticated using (public.is_active_user()) with check (public.is_active_user());

-- Istoric: doar citire. Nicio politică de insert/update/delete =>
-- nimeni din aplicație nu îl poate altera (triggerul e security definer).
create policy audit_select on public.audit_log for select to authenticated using (public.is_active_user());

-- Drepturi explicite (anon nu are acces la nimic)
revoke all on all tables in schema public from anon;
grant select, insert, update on public.cabinets, public.rooms, public.procedures, public.appointments to authenticated;
grant select, update on public.profiles, public.app_settings to authenticated;
grant select on public.audit_log to authenticated;

-- Realtime: toți văd imediat programările noi / modificate.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;
