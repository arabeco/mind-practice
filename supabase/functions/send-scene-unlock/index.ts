// ============================================================================
// send-scene-unlock
// Roda periodicamente (pg_cron). Varre game_state.state_json->'campaigns',
// acha campanhas cuja cena destravou (>24h do ultimo answered), manda push,
// e grava em campaign_notifications pra nao notificar duas vezes.
// ============================================================================
//
// Invocar via cron:
//   select cron.schedule(
//     'scene-unlock-sweeper',
//     '*/15 * * * *',
//     $$ select net.http_post(
//          url:='<project>.supabase.co/functions/v1/send-scene-unlock',
//          headers:=jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
//        ); $$
//   );
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendToRegistration, type Registration, type PushPayload } from '../_shared/push.ts';

// ms em 24h — usado pra checar "passou meia-noite UTC desde o ultimo answered"
const UNLOCK_DELAY_MS = 24 * 60 * 60 * 1000;

interface CampaignProgressBlob {
  deckId: string;
  seasonId: string;
  lastAnsweredAt: string | null;
  currentSceneId: string;
  endingId: string | null;
}

interface GameStateRow {
  user_id: string;
  state_json: { campaigns?: Record<string, CampaignProgressBlob> } | null;
}

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Protege: so aceita chamadas com service role (cron usa isso).
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.includes(SERVICE_ROLE)) {
    return new Response('unauthorized', { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1. Pega todos os game_state que tem pelo menos uma campanha em andamento.
  //    Filtro grosso: json nao-nulo. Refino in-memory.
  const { data: rows, error: rowsErr } = await admin
    .from('game_state')
    .select('user_id, state_json')
    .not('state_json->campaigns', 'is', null);

  if (rowsErr) {
    return new Response(JSON.stringify({ error: rowsErr.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = Date.now();
  // Candidatos: {user_id, seasonId, lastAnsweredAt}
  const candidates: { userId: string; seasonId: string; lastAnsweredAt: string }[] = [];

  for (const row of (rows ?? []) as GameStateRow[]) {
    const campaigns = row.state_json?.campaigns;
    if (!campaigns) continue;
    for (const seasonId of Object.keys(campaigns)) {
      const c = campaigns[seasonId];
      if (!c || c.endingId || !c.lastAnsweredAt) continue;
      const lastMs = Date.parse(c.lastAnsweredAt);
      if (Number.isNaN(lastMs)) continue;
      // Destravou: ja passou 24h desde o ultimo answered
      if (now - lastMs < UNLOCK_DELAY_MS) continue;
      candidates.push({
        userId: row.user_id,
        seasonId,
        lastAnsweredAt: c.lastAnsweredAt,
      });
    }
  }

  if (candidates.length === 0) {
    return new Response(JSON.stringify({ checked: 0, sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Filtra os que ja notificamos (dedupe por (user, season, lastAnsweredAt)).
  const userIds = [...new Set(candidates.map(c => c.userId))];
  const { data: alreadyNotified } = await admin
    .from('campaign_notifications')
    .select('user_id, season_id, last_answered_at')
    .in('user_id', userIds);

  const notifiedSet = new Set(
    (alreadyNotified ?? []).map(n =>
      `${n.user_id}::${n.season_id}::${new Date(n.last_answered_at).toISOString()}`,
    ),
  );

  const toNotify = candidates.filter(c =>
    !notifiedSet.has(`${c.userId}::${c.seasonId}::${new Date(c.lastAnsweredAt).toISOString()}`),
  );

  if (toNotify.length === 0) {
    return new Response(JSON.stringify({ checked: candidates.length, sent: 0, note: 'todos ja notificados' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Busca registrations de todos os users que vao receber.
  const targetUserIds = [...new Set(toNotify.map(c => c.userId))];
  const { data: regs } = await admin
    .from('push_registrations')
    .select('id, user_id, kind, endpoint, p256dh, auth_key, fcm_token')
    .in('user_id', targetUserIds);

  const regsByUser = new Map<string, (Registration & { user_id: string })[]>();
  for (const r of (regs ?? []) as (Registration & { user_id: string })[]) {
    const list = regsByUser.get(r.user_id) ?? [];
    list.push(r);
    regsByUser.set(r.user_id, list);
  }

  // 4. Dispara em paralelo por candidato. Cada user pode ter varios devices.
  const sendTasks: Promise<{
    ok: boolean; expired: boolean; regId: string; candidate: typeof toNotify[number];
  }>[] = [];

  for (const cand of toNotify) {
    const userRegs = regsByUser.get(cand.userId) ?? [];
    if (userRegs.length === 0) continue; // sem device, marca como notificado mesmo assim (evita reprocesso eterno)

    const payload: PushPayload = {
      title: 'Nova cena destravada',
      body: 'O livro abriu uma pagina nova. Volte pra ler.',
      url: `/campanha/${cand.seasonId}`,
      tag: `scene-unlock-${cand.seasonId}`,
    };

    for (const reg of userRegs) {
      sendTasks.push(
        sendToRegistration(reg, payload).then(res => ({
          ok: res.ok,
          expired: !!res.expired,
          regId: reg.id,
          candidate: cand,
        })),
      );
    }
  }

  const results = await Promise.all(sendTasks);

  // 5. Limpa subscriptions expiradas
  const expiredIds = results.filter(r => r.expired).map(r => r.regId);
  if (expiredIds.length) {
    await admin.from('push_registrations').delete().in('id', expiredIds);
  }

  // 6. Marca candidatos como notificados (inclusive os sem device — evita reprocesso).
  //    Upsert idempotente na chave composta.
  const notifRows = toNotify.map(c => ({
    user_id: c.userId,
    season_id: c.seasonId,
    last_answered_at: c.lastAnsweredAt,
  }));

  if (notifRows.length) {
    await admin
      .from('campaign_notifications')
      .upsert(notifRows, { onConflict: 'user_id,season_id,last_answered_at', ignoreDuplicates: true });
  }

  return new Response(JSON.stringify({
    checked: candidates.length,
    candidates: toNotify.length,
    sent: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok && !r.expired).length,
    expired: expiredIds.length,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
