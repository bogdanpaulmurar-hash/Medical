-- =====================================================================
-- Etapa 1 (v3.2): capacitate pe aparat, pacienți cu plan de proceduri.
--
--   * saloanele devin „aparate / săli” cu capacitate (pacienți simultan);
--   * procedurile primesc nume scurt, culoare și lista aparatelor pe care
--     se pot face (mai multe aparate = capacitate paralelă);
--   * pacienți cu plan de proceduri (patients, patient_plan);
--   * conflictul de aparat ține cont de capacitate (trigger), nu mai este
--     constrângere EXCLUDE, care nu poate număra locuri;
--   * o programare legată de un pacient trebuie să fie pentru o procedură
--     din planul lui;
--   * programările pot rămâne fără medic curant (medicul vine din fișa
--     pacientului).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Aparate / săli: capacitate și public
-- ---------------------------------------------------------------------
alter table public.rooms
  add column capacity int not null default 1 check (capacity between 1 and 100),
  add column audience text not null default 'all' check (audience in ('all', 'inpatient', 'outpatient'));

-- ---------------------------------------------------------------------
-- Proceduri: nume scurt, culoare, aparate
-- ---------------------------------------------------------------------
alter table public.procedures
  add column short_name text not null default '' check (length(short_name) <= 24),
  add column color text not null default '#0f766e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  add column room_ids uuid[] not null default '{}';

-- ---------------------------------------------------------------------
-- Pacienți și plan de proceduri
-- ---------------------------------------------------------------------
create table public.patients (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (length(code) between 1 and 32),
  initials    text not null check (length(initials) between 1 and 8),
  name        text,           -- opțional
  diagnosis   text,           -- opțional
  notes       text,           -- opțional (atenționări)
  kind        text not null default 'inpatient' check (kind in ('inpatient', 'outpatient')),
  doctor_id   uuid references public.profiles (id) on delete restrict,
  start_date  date not null default current_date,
  active      boolean not null default true,
  created_by  uuid references public.profiles (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.patient_plan (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete restrict,
  procedure_id  uuid not null references public.procedures (id) on delete restrict,
  sessions      int not null default 10 check (sessions between 1 and 90),
  frequency     text not null default 'daily' check (frequency in ('daily', 'alternate', 'weekly')),
  duration      int check (duration between 5 and 720),   -- null = durata procedurii
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (patient_id, procedure_id)
);
create index patient_plan_patient_idx on public.patient_plan (patient_id);

create trigger patients_touch before update on public.patients
  for each row execute function public.touch_row();
create trigger patient_plan_touch before update on public.patient_plan
  for each row execute function public.touch_row();

-- ---------------------------------------------------------------------
-- Programări: legătura cu pacientul, medic opțional
-- ---------------------------------------------------------------------
alter table public.appointments
  add column patient_id uuid references public.patients (id) on delete restrict,
  alter column attending_id drop not null;
create index appointments_patient_idx on public.appointments (patient_id, starts_at);

-- Același pacient nu poate fi în două locuri în același timp.
alter table public.appointments
  add constraint no_patient_overlap exclude using gist (
    patient_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show') and patient_id is not null);

-- Aparatul: capacitate în loc de „un singur pacient”.
alter table public.appointments drop constraint no_room_overlap;

create or replace function public.check_room_capacity()
returns trigger
language plpgsql
as $$
declare
  cap  int;
  t    timestamptz;
  busy int;
begin
  if new.status in ('cancelled', 'no_show') then
    return new;
  end if;

  select capacity into cap from public.rooms where id = new.room_id;
  -- Serializăm programările pentru același aparat (două persoane în paralel).
  perform pg_advisory_xact_lock(hashtext('room:' || new.room_id::text));

  -- Numărul maxim de ședințe simultane se atinge la ora de început a uneia
  -- dintre ele: verificăm începutul acesteia și începuturile celor care o suprapun.
  for t in
    select new.starts_at
    union
    select a.starts_at
    from public.appointments a
    where a.room_id = new.room_id
      and a.id is distinct from new.id
      and a.status not in ('cancelled', 'no_show')
      and a.starts_at > new.starts_at and a.starts_at < new.ends_at
  loop
    select count(*) into busy
    from public.appointments a
    where a.room_id = new.room_id
      and a.id is distinct from new.id
      and a.status not in ('cancelled', 'no_show')
      and a.starts_at <= t and a.ends_at > t;
    if busy + 1 > cap then
      raise exception 'conflicting key value violates exclusion constraint "no_room_overlap"'
        using errcode = '23P01';
    end if;
  end loop;
  return new;
end;
$$;

create trigger appointments_room_capacity
  before insert or update of room_id, starts_at, ends_at, status on public.appointments
  for each row execute function public.check_room_capacity();

-- O programare legată de un pacient trebuie să fie pentru o procedură din
-- planul lui activ (persoana de la programări vede doar acele proceduri).
create or replace function public.check_in_plan()
returns trigger
language plpgsql
as $$
begin
  if new.patient_id is not null
     and (tg_op = 'INSERT' or new.procedure_id is distinct from old.procedure_id
          or new.patient_id is distinct from old.patient_id)
     and not exists (
       select 1 from public.patient_plan p
       where p.patient_id = new.patient_id and p.procedure_id = new.procedure_id and p.active
     ) then
    raise exception 'procedure not in patient plan (not_in_plan)' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger appointments_in_plan
  before insert or update on public.appointments
  for each row execute function public.check_in_plan();

-- ---------------------------------------------------------------------
-- Istoric, RLS, drepturi
-- ---------------------------------------------------------------------
create trigger audit_patients after insert or update or delete on public.patients
  for each row execute function public.write_audit();
create trigger audit_patient_plan after insert or update or delete on public.patient_plan
  for each row execute function public.write_audit();

alter table public.patients      enable row level security;
alter table public.patient_plan  enable row level security;

create policy patients_select on public.patients for select to authenticated using (public.is_active_user());
create policy patients_insert on public.patients for insert to authenticated with check (public.is_active_user());
create policy patients_update on public.patients for update to authenticated using (public.is_active_user()) with check (public.is_active_user());

create policy plan_select on public.patient_plan for select to authenticated using (public.is_active_user());
create policy plan_insert on public.patient_plan for insert to authenticated with check (public.is_active_user());
create policy plan_update on public.patient_plan for update to authenticated using (public.is_active_user()) with check (public.is_active_user());

revoke all on public.patients, public.patient_plan from anon;
grant select, insert, update on public.patients, public.patient_plan to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.patients, public.patient_plan;
  end if;
end $$;
