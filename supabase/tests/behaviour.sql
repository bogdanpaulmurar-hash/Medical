-- Test local (Postgres simplu + schema auth simulată). Rulează ca superuser.
\set ON_ERROR_STOP 1
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'admin@example.test', '{"full_name":"Dr. Admin","role":"admin"}'),
  ('00000000-0000-0000-0000-000000000002', 'curant@example.test', '{"full_name":"Dr. Curant","role":"attending"}'),
  ('00000000-0000-0000-0000-000000000003', 'primitor@example.test', '{"full_name":"Dr. Primitor","role":"receiving"}'),
  ('00000000-0000-0000-0000-000000000004', 'inactiv@example.test', '{}');
update public.profiles set active = false where email = 'inactiv@example.test';
select count(*) = 4 as profiles_created from public.profiles;

insert into public.cabinets (id, name) values ('10000000-0000-0000-0000-000000000001', 'Cabinet 1');
insert into public.rooms (id, cabinet_id, name) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Salon A'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Salon B');
insert into public.procedures (id, name) values ('30000000-0000-0000-0000-000000000001', 'Procedura X');

-- Acționăm ca utilizatorul „curant”
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

insert into public.appointments (patient_code, patient_initials, procedure_id, room_id, starts_at, ends_at, attending_id, receiving_id)
values ('P001', 'AB', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '2030-01-10 09:00+02', '2030-01-10 10:00+02', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');

-- Conflict de salon
do $$ begin
  insert into public.appointments (patient_code, patient_initials, procedure_id, room_id, starts_at, ends_at, attending_id)
  values ('P002', 'CD', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
          '2030-01-10 09:30+02', '2030-01-10 10:30+02', '00000000-0000-0000-0000-000000000001');
  raise exception 'room conflict NOT detected';
exception when exclusion_violation then raise notice 'OK room conflict blocked: %', sqlerrm; end $$;

-- Conflict de medic primitor (alt salon)
do $$ begin
  insert into public.appointments (patient_code, patient_initials, procedure_id, room_id, starts_at, ends_at, attending_id, receiving_id)
  values ('P003', 'EF', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
          '2030-01-10 09:45+02', '2030-01-10 10:15+02', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003');
  raise exception 'receiving conflict NOT detected';
exception when exclusion_violation then raise notice 'OK receiving conflict blocked'; end $$;

-- Back-to-back e permis
insert into public.appointments (patient_code, patient_initials, procedure_id, room_id, starts_at, ends_at, attending_id)
values ('P004', 'GH', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '2030-01-10 10:00+02', '2030-01-10 10:30+02', '00000000-0000-0000-0000-000000000002');

-- Edit + istoric
update public.appointments set status = 'confirmed', notes = 'test' where patient_code = 'P001';
select count(*) = 3 as audit_rows_for_appts, bool_and(changed_by_email = 'curant@example.test') as audit_who
  from public.audit_log where table_name = 'appointments';

-- Istoricul nu poate fi alterat
do $$ begin
  delete from public.audit_log; 
  if (select count(*) from public.audit_log) = 0 then raise exception 'audit deleted!'; end if;
  raise notice 'OK audit delete had no effect';
exception when insufficient_privilege then raise notice 'OK audit delete denied'; end $$;

-- DELETE pe programări nu e permis
do $$ begin
  delete from public.appointments;
  raise exception 'appointment delete allowed';
exception when insufficient_privilege then raise notice 'OK appointment delete denied'; end $$;

-- Nu-și poate schimba singur rolul
do $$ begin
  update public.profiles set role = 'admin' where id = auth.uid();
  raise exception 'self role change allowed';
exception when insufficient_privilege then raise notice 'OK self role change denied'; end $$;
-- Dar își poate schimba preferințele
update public.profiles set notify_sms = true where id = auth.uid();

-- Setările (SMS) doar admin
update public.app_settings set sms_enabled = true;
select sms_enabled = false as non_admin_cannot_enable_sms from public.app_settings;

-- Utilizator inactiv nu vede nimic
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
select count(*) = 0 as inactive_sees_nothing from public.appointments;

-- Admin poate activa SMS
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
update public.app_settings set sms_enabled = true;
select sms_enabled as admin_can_enable_sms from public.app_settings;
reset role;
