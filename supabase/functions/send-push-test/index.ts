// ============================================================================
// send-push-test
// Dispara um push pro proprio usuario autenticado. Usado pelo painel GM.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendToRegistration, type Registration, type PushPayload } from '../_shared/push.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1. Autentica com o JWT do usuario (pra descobrir quem e)
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'not authenticated' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const payload: PushPayload = await req.json().catch(() => ({
    title: 'MindPractice',
    body: 'Push de teste',
  }));

  // 2. Service role pra ler registrations sem passar por RLS
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: regs, error: regErr } = await admin
    .from('push_registrations')
    .select('id, kind, endpoint, p256dh, auth_key, fcm_token')
    .eq('user_id', user.id);

  if (regErr) {
    return new Response(JSON.stringify({ error: regErr.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  if (!regs || regs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'Nenhuma subscription registrada' }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 3. Dispara em paralelo
  const results = await Promise.all(
    (regs as Registration[]).map(r => sendToRegistration(r, payload)),
  );

  // 4. Limpa subscriptions expiradas
  const expiredIds = results.filter(r => r.expired).map(r => r.id);
  if (expiredIds.length) {
    await admin.from('push_registrations').delete().in('id', expiredIds);
  }

  const summary = {
    sent: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    expired: expiredIds.length,
    results,
  };

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
