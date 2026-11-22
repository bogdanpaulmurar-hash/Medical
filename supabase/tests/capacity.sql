\set ON_ERROR_STOP 1
-- Aparat cu capacitate 3 (ex. Ultrasunete) și pacient cu plan.
reset role;
insert into public.cabinets (id, name) values ('10000000-0000-0000-0000-0000000000c1', 'Cat X');
insert into public.rooms (id, cabinet_id, name, capacity) values ('20000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-0000000000c1','Aparat 3 locuri', 3);
insert into public.rooms (id, cabinet_id, name, capacity) values ('20000000-0000-0000-0000-0000000000c2','10000000-0000-0000-0000-0000000000c1','Aparat B', 3);
insert into public.procedures (id, name, room_ids) values ('30000000-0000-0000-0000-0000000000c1','Proc 10 min', array['20000000-0000-0000-0000-0000000000c1']::uuid[]);
insert into public.patients (id, code, initials) values ('40000000-0000-0000-0000-000000000001','C1','AA'),('40000000-0000-0000-0000-000000000002','C2','BB'),('40000000-0000-0000-0000-000000000003','C3','CC'),('40000000-0000-0000-0000-000000000004','C4','DD');
insert into public.patient_plan (patient_id, procedure_id) select id, '30000000-0000-0000-0000-0000000000c1' from public.patients where code like 'C%' and code <> 'C4';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
-- 3 pacienți simultan: OK
insert into public.appointments (patient_id, patient_code, patient_initials, procedure_id, room_id, starts_at, ends_at)
select id, code, initials, '30000000-0000-0000-0000-0000000000c1','20000000-0000-0000-0000-0000000000c1','2030-02-01 09:00+02','2030-02-01 09:10+02' from public.patients where code in ('C1','C2','C3');
-- Al 4-lea: peste capacitate (C4 nu are plan; adăugăm plan, apoi încercăm)
reset role;
insert into public.patient_plan (patient_id, procedure_id) values ('40000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-0000000000c1');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$ begin
  insert into public.appointments (patient_id, patient_code, patient_initials, procedure_id, room_id, starts_at, ends_at)
  values ('40000000-0000-0000-0000-000000000004','C4','DD','30000000-0000-0000-0000-0000000000c1','20000000-0000-0000-0000-0000000000c1','2030-02-01 09:05+02','2030-02-01 09:15+02');
  raise exception 'capacity NOT enforced';
exception when exclusion_violation then raise notice 'OK capacity blocked: %', sqlerrm; end $$;
-- Imediat după: permis (09:10 liber)
insert into public.appointments (patient_id, patient_code, patient_initials, procedure_id, room_id, starts_at, ends_at)
values ('40000000-0000-0000-0000-000000000004','C4','DD','30000000-0000-0000-0000-0000000000c1','20000000-0000-0000-0000-0000000000c1','2030-02-01 09:10+02','2030-02-01 09:20+02');
-- Același pacient în două locuri: blocat
do $$ begin
  insert into public.appointments (patient_id, patient_code, patient_initials, procedure_id, room_id, starts_at, ends_at)
  values ('40000000-0000-0000-0000-000000000001','C1','AA','30000000-0000-0000-0000-0000000000c1','20000000-0000-0000-0000-0000000000c2','2030-02-01 09:05+02','2030-02-01 09:15+02');
  raise exception 'patient overlap NOT detected';
exception when exclusion_violation then
  if sqlerrm not like '%no_patient_overlap%' then raise exception 'wrong constraint: %', sqlerrm; end if;
  raise notice 'OK patient overlap blocked'; end $$;
-- Procedură care nu e în plan: blocat
reset role;
insert into public.procedures (id, name) values ('30000000-0000-0000-0000-0000000000c2','Altă procedură');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$ begin
  insert into public.appointments (patient_id, patient_code, patient_initials, procedure_id, room_id, starts_at, ends_at)
  values ('40000000-0000-0000-0000-000000000001','C1','AA','30000000-0000-0000-0000-0000000000c2','20000000-0000-0000-0000-0000000000c1','2030-02-02 09:00+02','2030-02-02 09:10+02');
  raise exception 'not-in-plan NOT detected';
exception when check_violation then raise notice 'OK not in plan blocked'; end $$;
-- Programare fără medic curant: permisă
insert into public.appointments (patient_id, patient_code, patient_initials, procedure_id, room_id, starts_at, ends_at)
values ('40000000-0000-0000-0000-000000000001','C1','AA','30000000-0000-0000-0000-0000000000c1','20000000-0000-0000-0000-0000000000c1','2030-02-03 09:00+02','2030-02-03 09:10+02');
-- Mutarea unei programări existente (update) nu se numără cu ea însăși
update public.appointments set starts_at = '2030-02-01 09:01+02', ends_at = '2030-02-01 09:11+02' where patient_code = 'C1' and starts_at = '2030-02-01 09:00+02';
-- Anularea eliberează locul
update public.appointments set status = 'cancelled' where patient_code = 'C2' and status = 'planned';
insert into public.patients (id, code, initials) select '40000000-0000-0000-0000-000000000009','C9','ZZ' where false;
select count(*) = 4 as plan_rows from public.patient_plan where patient_id in (select id from public.patients where code like 'C%');
select count(*) >= 5 as audit_patient_rows from public.audit_log where table_name in ('patients','patient_plan');
reset role;
