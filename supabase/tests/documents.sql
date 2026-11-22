\set ON_ERROR_STOP 1
-- Rulează după capacity.sql (există utilizatorii 1-3 și pacienții C1-C4).
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000005', 'prog@example.test', '{"full_name":"Persoana programari","role":"scheduler"}');
-- Medicul curant poate scrie și citi
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
insert into public.patient_documents (patient_id, kind, data) values ('40000000-0000-0000-0000-000000000001', 'bilet', '{"age":"54","app":"HTA"}');
update public.patient_documents set data = '{"age":"55","app":"HTA, DZ"}' where kind = 'bilet';
select count(*) = 1 as doctor_reads from public.patient_documents;
-- Un singur document pe (pacient, tip)
do $$ begin
  insert into public.patient_documents (patient_id, kind) values ('40000000-0000-0000-0000-000000000001', 'bilet');
  raise exception 'duplicate allowed';
exception when unique_violation then raise notice 'OK unique per patient+kind'; end $$;
-- Tip necunoscut: refuzat
do $$ begin
  insert into public.patient_documents (patient_id, kind) values ('40000000-0000-0000-0000-000000000002', 'xx');
  raise exception 'bad kind allowed';
exception when check_violation then raise notice 'OK bad kind rejected'; end $$;
-- Persoana de la programări: nu vede nimic și nu poate scrie
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000005';
select count(*) = 0 as scheduler_sees_nothing from public.patient_documents;
do $$ begin
  insert into public.patient_documents (patient_id, kind) values ('40000000-0000-0000-0000-000000000002', 'a16');
  raise exception 'scheduler insert allowed';
exception when insufficient_privilege then raise notice 'OK scheduler insert blocked'; end $$;
-- Persoana de la programări nu poate șterge; un medic poate
do $$ declare n int; begin
  delete from public.patient_documents;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'scheduler deleted'; end if;
  raise notice 'OK scheduler deletes nothing';
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
delete from public.patient_documents;
select count(*) = 0 as doctor_deleted from public.patient_documents;
-- Setarea de păstrare există și este activă implicit
select keep_documents as keep_default_true from public.app_settings;
-- Retenție: documentul expirat nu se mai vede și se șterge la purjare
reset role;
insert into public.patient_documents (patient_id, kind, data, updated_at) values ('40000000-0000-0000-0000-000000000003', 'a16', '{"x":"HTA"}', now() - interval '40 days');
update public.app_settings set documents_retention_days = 30;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select count(*) = 0 as expired_hidden from public.patient_documents;
select public.purge_expired_documents() = 1 as purged_one;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000005';
do $$ begin perform public.purge_expired_documents(); raise exception 'scheduler purge allowed';
exception when insufficient_privilege then raise notice 'OK scheduler purge blocked'; end $$;
reset role; update public.app_settings set documents_retention_days = null;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
-- Istoricul există (inserare, modificare, ștergere), dar fără conținut clinic
select count(*) = 5 as audit_rows from public.audit_log where table_name = 'patient_documents';
select count(*) = 0 as audit_has_no_text
from public.audit_log where table_name = 'patient_documents' and (new_data::text like '%HTA%' or old_data::text like '%HTA%');
