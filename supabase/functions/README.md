# Supabase Edge Functions — Push Notifications

## Setup inicial (1x só)

### 1. Rodar o delta SQL
No SQL Editor, rode os blocos do final do `supabase/schema.sql`:
- `PUSH NOTIFICATIONS` → tabela `push_registrations` com RLS
- `CAMPAIGN NOTIFICATIONS` → tabela `campaign_notifications` (dedupe do cron)

### 2. Configurar secrets da Edge Function

No dashboard → Edge Functions → Manage Secrets, adicionar:

```
VAPID_PUBLIC_KEY  = BB-mCUA3qqLb_AIi13WH1814cIiD1tWLrwGdPh6jFMqA3wDioopKgQYTSvIFeSVxHYMRdm00vrSd78MHF0dACtU
VAPID_PRIVATE_KEY = ru4pIMUL8IS6HuzSqOROdBFYby_O-1jAtYHq3Yd4fYI
VAPID_SUBJECT     = mailto:contato@mindpractice.app
```

(Essas sao as chaves geradas pro projeto. `SUPABASE_URL`, `SUPABASE_ANON_KEY`
e `SUPABASE_SERVICE_ROLE_KEY` o Supabase injeta automaticamente.)

### 3. Deploy das functions

```
npx supabase functions deploy send-push-test
npx supabase functions deploy send-scene-unlock
```

## Testando end-to-end

1. Rodar `npm run dev` → painel GM aparece no canto inferior direito
2. No painel: **2. Ativar push** → aceita permissao → confirma "Registrado (web)"
3. No painel: **3. Push do servidor** → deve cair uma notificacao nativa

Se der erro:
- "Precisa estar logado" → faz login (Google ou email)
- "Nao suportado: No Push API" → browser sem suporte (Safari <16.4)
- "Nao suportado: VAPID key not set" → `.env.local` sem `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- "nenhuma subscription" → o botao 2 falhou, ver console do browser

## Cron — scene-unlock sweeper

O `send-scene-unlock` le `game_state.state_json->'campaigns'` direto (via service
role) e notifica quem passou 24h desde o ultimo `lastAnsweredAt` e ainda nao foi
avisado dessa virada. Dedupe em `campaign_notifications`.

### Habilitar extensoes (1x)
No dashboard → Database → Extensions, habilitar:
- `pg_cron`
- `pg_net` (pra `net.http_post`)

### Guardar service role pro cron
```sql
-- SQL Editor (roda 1x):
alter database postgres set "app.settings.service_role_key" = '<SEU_SERVICE_ROLE_KEY>';
```

### Agendar
```sql
select cron.schedule(
  'scene-unlock-sweeper',
  '*/15 * * * *',
  $$ select net.http_post(
       url:='https://<projeto>.supabase.co/functions/v1/send-scene-unlock',
       headers:=jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
         'Content-Type', 'application/json'
       )
     ); $$
);

-- Ver jobs ativos:
select * from cron.job;

-- Ver historico:
select * from cron.job_run_details order by start_time desc limit 20;

-- Desagendar:
-- select cron.unschedule('scene-unlock-sweeper');
```

### Testar sem esperar cron
```bash
curl -X POST https://<projeto>.supabase.co/functions/v1/send-scene-unlock \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
# resposta: {"checked": N, "candidates": M, "sent": X, ...}
```

## FCM (Capacitor)

Quando o APK existir:
1. Criar projeto Firebase
2. Baixar `google-services.json`
3. Setar secret `GOOGLE_SERVICE_ACCOUNT_JSON` com o conteudo do service account
4. Implementar `sendFcmPush()` em `_shared/push.ts` (ja tem o TODO marcado)
