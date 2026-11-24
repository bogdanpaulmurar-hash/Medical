-- Număr de rânduri pe tabelele aplicației + utilizatori + starea migrărilor.
-- Folosit de 01-snapshot.sh (înainte) și 06-smoke-test.sh (după), ca să comparăm.
select 'auth.users=' || count(*) from auth.users
union all select 'public.profiles=' || count(*) from public.profiles
union all select 'public.cabinets=' || count(*) from public.cabinets
union all select 'public.rooms=' || count(*) from public.rooms
union all select 'public.procedures=' || count(*) from public.procedures
union all select 'public.app_settings=' || count(*) from public.app_settings
union all select 'public.patients=' || count(*) from public.patients
union all select 'public.patient_plan=' || count(*) from public.patient_plan
union all select 'public.appointments=' || count(*) from public.appointments
union all select 'public.patient_documents=' || count(*) from public.patient_documents
union all select 'public.audit_log=' || count(*) from public.audit_log
union all select 'migration_0006_overlap_ok=' || exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'appointments' and column_name = 'overlap_ok');
