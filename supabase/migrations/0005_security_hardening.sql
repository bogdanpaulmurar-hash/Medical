-- =====================================================================
-- Întărire de securitate (după verificarea automată Supabase):
--   * funcțiile interne (declanșatoare) nu mai pot fi apelate din API;
--   * funcțiile de verificare a drepturilor pot fi apelate doar de utilizatorii
--     autentificați (politicile RLS au nevoie de ele), nu și anonim;
--   * funcțiile fără search_path fix primesc unul.
-- Nu modifică date și nu schimbă comportamentul aplicației.
-- =====================================================================
alter function public.touch_row() set search_path = public, pg_temp;
alter function public.check_in_plan() set search_path = public, pg_temp;
alter function public.check_room_capacity() set search_path = public, pg_temp;

-- Declanșatoare: nu au nevoie de EXECUTE pentru nimeni.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_fields() from public, anon, authenticated;
revoke all on function public.write_audit() from public, anon, authenticated;
revoke all on function public.write_settings_audit() from public, anon, authenticated;
revoke all on function public.write_document_audit() from public, anon, authenticated;
revoke all on function public.touch_row() from public, anon, authenticated;
revoke all on function public.check_in_plan() from public, anon, authenticated;
revoke all on function public.check_room_capacity() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Funcții folosite de politicile RLS: doar utilizatori autentificați.
revoke all on function public.is_active_user() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_doctor() from public, anon;
revoke all on function public.document_is_current(timestamptz) from public, anon;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_doctor() to authenticated;
grant execute on function public.document_is_current(timestamptz) to authenticated;

-- Aplicația cheamă doar asta, doar autentificat.
revoke all on function public.purge_expired_documents() from public, anon;
grant execute on function public.purge_expired_documents() to authenticated;
