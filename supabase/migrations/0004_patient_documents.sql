-- =====================================================================
-- v3.8: documente medicale la pacient (bilet de ieșire, referate).
--
--   * un rând pe (pacient, tip de document); conținutul este un obiect
--     JSON cu rubricile completate (texte);
--   * DOAR medicii (administrator, medic curant, medic primitor) pot
--     citi sau scrie: persoana de la programări nu are acces, nici prin
--     API, nici prin istoric;
--   * păstrarea se pornește/oprește din Setări (app_settings.keep_documents);
--   * istoricul păstrează cine / ce / când a modificat, dar NU și textul
--     documentului: tabela audit_log este citibilă de toți utilizatorii
--     activi, iar conținutul clinic nu trebuie să ajungă acolo.
-- Numele și CNP-ul pacientului nu se introduc în aceste documente.
-- =====================================================================

create or replace function public.is_doctor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role in ('admin', 'attending', 'receiving')
  );
$$;

create table public.patient_documents (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete restrict,
  kind        text not null check (kind in ('bilet', 'a16', 'a5', 'hc', 'a39b')),
  data        jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 200000),
  updated_by  uuid references public.profiles (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (patient_id, kind)
);

create trigger patient_documents_touch before update on public.patient_documents
  for each row execute function public.touch_row();

-- Istoric fără conținut: doar documentul, pacientul, tipul și momentul.
create or replace function public.write_document_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_row   public.patient_documents := coalesce(new, old);
  v_meta  jsonb := jsonb_build_object('id', v_row.id, 'patient_id', v_row.patient_id, 'kind', v_row.kind);
begin
  insert into public.audit_log (table_name, record_id, action, changed_by, changed_by_email, old_data, new_data)
  values ('patient_documents', v_row.id, tg_op, v_uid,
          (select email from public.profiles where id = v_uid),
          case when tg_op in ('UPDATE', 'DELETE') then v_meta end,
          case when tg_op in ('INSERT', 'UPDATE') then v_meta end);
  return coalesce(new, old);
end;
$$;

create trigger audit_patient_documents after insert or update or delete on public.patient_documents
  for each row execute function public.write_document_audit();

-- Păstrarea documentelor se decide din Setări: pornit/oprit și politica de retenție
-- (câte zile de la ultima modificare; null = până le șterge cineva).
alter table public.app_settings
  add column keep_documents boolean not null default true,
  add column documents_retention_days int check (documents_retention_days is null or documents_retention_days between 1 and 3660);

-- Un document expirat nu mai poate fi citit sau modificat, chiar înainte de ștergere.
create or replace function public.document_is_current(p_updated timestamptz)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select documents_retention_days is null
            or p_updated > now() - make_interval(days => documents_retention_days)
     from public.app_settings where id = 1), true);
$$;

-- Șterge documentele expirate (aplicația o cheamă la deschidere, pentru medici;
-- se poate programa și cu pg_cron).
create or replace function public.purge_expired_documents()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if auth.uid() is not null and not public.is_doctor() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.patient_documents d where not public.document_is_current(d.updated_at);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.purge_expired_documents() from public;
grant execute on function public.purge_expired_documents() to authenticated;

alter table public.patient_documents enable row level security;

create policy docs_select on public.patient_documents for select to authenticated using (public.is_doctor() and public.document_is_current(updated_at));
create policy docs_insert on public.patient_documents for insert to authenticated with check (public.is_doctor());
create policy docs_update on public.patient_documents for update to authenticated using (public.is_doctor() and public.document_is_current(updated_at)) with check (public.is_doctor());
-- Ștergerea este permisă medicilor (un document irelevant se poate elimina); istoricul păstrează faptul că a fost șters, fără conținut.
create policy docs_delete on public.patient_documents for delete to authenticated using (public.is_doctor());

grant select, insert, update, delete on public.patient_documents to authenticated;


