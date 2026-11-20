// Edge Function „invite-user”: doar un administrator activ poate invita.
// Trimite emailul de invitație Supabase; profilul se creează automat
// (trigger handle_new_user) cu numele și rolul din metadata.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';

  // Cine face cererea?
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: isAdmin } = await asUser.rpc('is_admin');
  if (!isAdmin) return new Response('forbidden', { status: 403, headers: cors });

  const { email, full_name, role, redirect_to } = await req.json();
  if (!['admin', 'attending', 'scheduler', 'receiving'].includes(role)) {
    return new Response('bad role', { status: 400, headers: cors });
  }
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
    redirectTo: redirect_to,
  });
  if (error) return new Response(error.message, { status: 400, headers: cors });
  return new Response('ok', { headers: cors });
});
