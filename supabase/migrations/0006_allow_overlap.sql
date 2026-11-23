-- =====================================================================
-- v4.9: suprapunere permisă, la alegerea persoanei care programează.
--
--   * programarea primește marcajul overlap_ok (implicit false);
--   * regulile care blochează suprapunerea (același medic, același pacient,
--     capacitatea aparatului) nu se mai aplică unei programări marcate;
--   * aplicația avertizează înainte și afișează programarea cu altă culoare;
--   * istoricul păstrează marcajul, ca orice altă modificare.
-- =====================================================================

alter table public.appointments
  add column overlap_ok boolean not null default false;

alter table public.appointments
  drop constraint no_attending_overlap,
  drop constraint no_receiving_overlap,
  drop constraint no_patient_overlap;

alter table public.appointments
  add constraint no_attending_overlap exclude using gist (
    attending_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show') and not overlap_ok),
  add constraint no_receiving_overlap exclude using gist (
    receiving_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show') and receiving_id is not null and not overlap_ok),
  add constraint no_patient_overlap exclude using gist (
    patient_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'no_show') and patient_id is not null and not overlap_ok);

create or replace function public.check_room_capacity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  cap  int;
  t    timestamptz;
  busy int;
begin
  if new.status in ('cancelled', 'no_show') or new.overlap_ok then
    return new;
  end if;

  select capacity into cap from public.rooms where id = new.room_id;
  perform pg_advisory_xact_lock(hashtext('room:' || new.room_id::text));

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

drop trigger appointments_room_capacity on public.appointments;
create trigger appointments_room_capacity
  before insert or update of room_id, starts_at, ends_at, status, overlap_ok on public.appointments
  for each row execute function public.check_room_capacity();

-- Funcția de trigger nu se cheamă direct de nimeni (ca în 0005).
revoke all on function public.check_room_capacity() from public, anon, authenticated;
