# MindPractice — Roadmap Agêntico até Soberania

> **Como ler:** cada **Fase** é um ciclo fechado de execução agêntica (brainstorm → spec → plan → subagent-driven-dev). Tem um **GATE de saída** objetivo. Só passa pra próxima depois de bater o gate. Cada fase lista também os **SQLs que o humano roda no Supabase SQL Editor** (marcados 🗄️).

**Status hoje:** Nível 5 (Engine). Destino: Nível 10 (Soberania).
**Estimativa linear:** 10-14 semanas em execução contínua agêntica, 4-5 meses com ritmo sustentável.

---

## 📋 TABELA-MESTRE

| Fase | Nome | Nível | Duração | SQL? |
|------|------|-------|---------|------|
| **F3** | Persistência indestrutível ✅ | 5→6 | 3-5 dias | ❌ |
| **F4** | Motor bayesiano em produção ✅ | 6 | 5-7 dias | ❌ |
| **F5** | Design System + telas rituais | 6 | 5-7 dias | ❌ |
| **F6** | Social real-time + leaderboard | 6→7 | 7-10 dias | 🗄️ sim |
| **F7** | Paywall + Stripe + economia | 7→8 | 7-10 dias | 🗄️ sim |
| **F8** | Mobile nativo (Capacitor) | 8 | 5-7 dias | ❌ |
| **F9** | Landing pública + captura + OG | 8→9 | 5-7 dias | 🗄️ sim |
| **F10** | Analytics + A/B + growth loops | 9 | 5-7 dias | 🗄️ sim |
| **F11** | Closed beta + build-in-public | 9 | contínuo | ❌ |
| **F12** | Receita + escala + otimização | 10 | contínuo | 🗄️ sim |

---

## 🧱 FASE 3 — PERSISTÊNCIA INDESTRUTÍVEL
**Gate para Nível 6.** Pré-requisito pra TUDO depois.

### Objetivo
Fazer o estado do app sobreviver a qualquer mudança de schema, crash, limpeza de cache ou conflito cross-device. Hoje `GameContext.tsx` tem 928 linhas e já perdeu dados (`runsPaidToday`). Inaceitável pra cobrar dinheiro.

### Tarefas
1. **Splittar `GameContext.tsx`** em 4 módulos: `GameContext.tsx` (provider), `gameReducer.ts` (puro, testável), `gamePersistence.ts` (localStorage + normalize + migrate), `gameSync.ts` (Supabase).
2. **Zod schema** de `GameState` em `src/lib/gameState/schema.ts`. `normalizeGameState` vira `schema.safeParse(raw) ?? DEFAULT`.
3. **Migration registry:** `migrations/v1-to-v2.ts`, `v2-to-v3.ts`. Cada migration é pure fn testada.
4. **Fixture suite:** snapshots v1/v2/v3 em `src/lib/gameState/__fixtures__/`. Teste: "v1 → v3 preserva wallet + dailies + achievements".
5. **Conflict resolution no sync:** last-write-wins com `updated_at`; se cloud > local > 5min, prompt "temos versão mais nova, carregar?".
6. **CI gate:** teste de migração roda em `npm test`. Falha se snapshot mudou sem bump.

### GATE ✅
- `GameContext.tsx` ≤ 150 linhas.
- 100% do estado validado por Zod no boundary.
- Teste "carrega save v1, usa app, estado íntegro" passa.
- Zero dados perdidos em migração (fixture coverage).

### Artefatos
- Spec: `docs/superpowers/specs/2026-04-XX-persistencia-indestrutivel.md`
- Plan: `docs/superpowers/plans/2026-04-XX-persistencia-indestrutivel.md`

---

## 🧠 FASE 4 — MOTOR BAYESIANO EM PRODUÇÃO  ✅ FECHADA (23/23) — 2026-04-24
**Mantém Nível 6. Plan:** `docs/superpowers/plans/2026-04-21-motor-bayesiano.md`.

### Objetivo
Trocar somatório de pesos por IRT/belief updates. Radar passa a mostrar crença + confiança; arquétipo tem estados "descobrindo / tendência / firme".

### Status
- ✅ **Tasks 1-12** — Engine puro (priors, likelihood, drift, update, archetype matching), tipos, validator, migração automática dos 22 decks, runScoring com evidence.
- ✅ **Tasks 13-14** — `CalibrationState.beliefs` integrado; reducer ANSWER + CAMPAIGN_ANSWER rodam `updateProfile`.
- ✅ **Task 15** — `getCurrentArchetype` + reducer START_DECK/FINISH_DECK usam `matchArchetypes(beliefs)`.
- ✅ **Task 16** — Schema v3→v4 wipe migration: pre-Bayes profiles resetam pra prior uniforme; wallet/streak/decks preservados.
- ✅ **Task 17** — `isTraining: true` decks bypassam mutação de perfil (beliefs intactos).
- ✅ **Task 18** — `MiniRadar` aceita `beliefs?: PlayerBeliefs` (playerMean recentered).
- ✅ **Task 19** — `ProfileCardCompact` + `/perfil` mostram `archetypeDisplayState` (discovering/tendency/firm) e label de confiança global.
- ✅ **Task 20** — `RunReportCard` mostra evidência per-answer ("O que isso revelou"); `DeckSnapshot.answers[]` carrega evidence.
- ✅ **Task 21** — `resolveWeights`/`CONTEXT_MODIFIERS`/`metadataMatches`, `intent`/`baseWeights` (502 campos), `weights` (256 campos), `axes`/`recentWeights`, `applyDampenedWeights`, `getDominantAxisFromWeights` removidos. Schema CalibrationSchema enxuto pra `{ beliefs, totalResponses, toneHistory, snapshots }`. UI hold-color deriva de `evidence`.
- ✅ **Task 22** — `docs/authoring/evidence-guide.md` (schema, thresholds, regras, anti-padrões).
- ✅ **Task 23** — Sanity verde + 30 testes bayes (3 edge cases novos: monotonicidade, simetria, isolamento de createPriorProfile).

### GATE ✅
- ✅ Radar/perfil renderizam belief + confidence.
- ✅ `archetypeDisplayState` gate: descobrindo < 0.3, tendência < 0.6, firme ≥ 0.6.
- ✅ Training decks bypassam persistência.
- ✅ Pipeline legado completamente removido. `Option.evidence` é o único formato. Validator exige `evidence`.
- ✅ RunReportCard surface evidence per-answer.

### Sanity (tip do main)
- `npx tsc --noEmit` — 0 erros
- `npm test` — 75/75 passando (30 testes bayesEngine + 45 outros)
- `npm run build` — 10 rotas geradas
- `npm run deck:validate` — 0 erros, 10 warnings (axis coverage de calibragem, content-side)

---

## 🎨 FASE 5 — DESIGN SYSTEM + TELAS RITUAIS  🟡 EM ANDAMENTO (F5a ✅, F5b pendente)
**Sobe ID visual de 7.5 → 9.**

### F5a — Tokens + Primitivos ✅
- ✅ `src/design/tokens.ts` — primitives + semantics tipados
- ✅ `globals.css` `@theme inline` sincronizado, com test de sync
- ✅ 6 componentes UI (`Button`, `Card`, `Dialog`, `Badge`, `Pill`, `Ring`) com cva variants
- ✅ `/dev/ui` showcase
- ✅ Migração de prova: `Toast`, `BottomNav`, `ProfileCardCompact` (zero hex literal)
- ✅ `scripts/check-utf8.ts` lint + sweep aplicado (568 substituições em 27 arquivos)
- ✅ `docs/design/tokens.md` + `components.md`

### F5b — Telas Rituais ⏳ (próximo brainstorm)
- ⏳ "Primeiro arquétipo" — full-screen takeover, dispara 1 vez
- ⏳ "Evolução" — quando arquétipo migra de A pra B
- ⏳ "Season finale" — Wrapped-style ao terminar season

### GATE F5a ✅
- 0 estilos inline (hex/raw) em `Toast`, `BottomNav`, `ProfileCardCompact`
- `tokens-sync.test.ts` verde
- `npm run check:utf8` zero violações
- `/dev/ui` mostra todos primitivos × variants

### Sanity (tip do main após F5a)
- `npx tsc --noEmit` — 0 erros
- `npm test` — 113/113 passando (testes existentes + UI/sync/utf8)
- `npm run build` — 12 rotas (11 + /dev/ui)
- `npm run check:utf8` — ✅
- `npm run deck:validate` — 0 erros, 10 warnings (content-side)

---

## 🌐 FASE 6 — SOCIAL REAL-TIME + LEADERBOARD
**Gate para Nível 7.** 🗄️ **Requer SQL.**

### Objetivo
Fricção viral: ver amigos, comparar, competir.

### Tarefas
1. **Friends UI:** tela `/amigos` (buscar por nickname, pedido/aceitar/rejeitar). Schema `friendships` já existe ✅.
2. **Feed real-time:** `/feed` com eventos dos amigos via Supabase Realtime subscription. `feed_events` schema pronto ✅.
3. **Leaderboard semanal** por season: tabela nova `season_scores`, ranking top-50 visível em `/mundo`.
4. **Presence:** mostrar quem tá online via Realtime presence (simples, opt-in).
5. **Batch emit** de eventos (`archetype_changed`, `deck_completed`, `streak_milestone`) no reducer puro (ganho da F3).

### 🗄️ SQL pra rodar no Supabase
```sql
-- season_scores: ranking por season
create table if not exists public.season_scores (
  season_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null default 0,
  archetype_id text,
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id)
);
create index if not exists season_scores_rank_idx
  on public.season_scores (season_id, score desc);

-- RLS: todo mundo lê, só dono escreve
alter table public.season_scores enable row level security;
create policy season_scores_read on public.season_scores for select using (true);
create policy season_scores_write on public.season_scores
  for insert with check (auth.uid() = user_id);
create policy season_scores_update on public.season_scores
  for update using (auth.uid() = user_id);

-- Habilita Realtime no feed_events e season_scores
alter publication supabase_realtime add table public.feed_events;
alter publication supabase_realtime add table public.season_scores;
```

### GATE ✅
- Mandar pedido → amigo recebe em < 2s via realtime.
- Feed carrega < 500ms com 50 eventos.
- Leaderboard ranqueia corretamente.

---

## 💰 FASE 7 — PAYWALL + STRIPE + ECONOMIA
**Gate para Nível 8.** 🗄️ **Requer SQL.** Primeira receita real.

### Objetivo
Converter o `/tiers` placeholder em paywall funcional com 3 ofertas validadas.

### Tarefas
1. **3 tiers definidos:**
   - **Free:** 3 runs grátis/dia, 1 deck semanal, perfil básico.
   - **Pro (R$ 14,90/mês):** runs ilimitadas, todos os decks, radar histórico, export premium cards.
   - **Founder (R$ 89 vitalício, cap 500 slots):** tudo + badge + early access + voto em decks novos.
2. **Stripe Checkout + Customer Portal** (Next.js API routes `/api/billing/*`).
3. **Webhook Stripe → Supabase:** edge function que atualiza `subscriptions` table.
4. **Gate client-side:** `useSubscription()` hook consulta `subscriptions`; se `tier !== 'free'`, desbloqueia.
5. **Tela de upgrade** aparece em momentos certos: quando acabam runs, quando tenta deck bloqueado, quando share card é "premium".
6. **Runs pagos avulsos:** R$ 1,90 por 5 runs (tem infra `runsPaidToday` já).

### 🗄️ SQL pra rodar no Supabase
```sql
create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  tier text not null default 'free' check (tier in ('free','pro','founder')),
  status text not null default 'active'
    check (status in ('active','past_due','canceled','trialing')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy subs_read_own on public.subscriptions
  for select using (auth.uid() = user_id);
-- writes só via service role (webhook edge function)

create table if not exists public.purchases (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('runs_pack','deck','season_pass')),
  amount_cents int not null,
  stripe_session_id text unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.purchases enable row level security;
create policy purchases_read_own on public.purchases
  for select using (auth.uid() = user_id);
```

### GATE ✅
- 1 compra real (você mesmo) passa ponta-a-ponta.
- Cancelamento no portal Stripe rebaixa tier em < 1min (webhook).
- Sem compra, usuário free esbarra em limites esperados.

---

## 📱 FASE 8 — MOBILE NATIVO (CAPACITOR)
**Completa Nível 8.**

### Objetivo
App na App Store + Play Store sem rewriting.

### Tarefas
1. **Capacitor 6** wrapping Next em build estático (`output: 'export'` onde possível; rotas dinâmicas viram client-side).
2. **Deep links** `mindpractice://` pra abrir em decks compartilhados.
3. **Push nativo** via FCM (infra web já existe — estender).
4. **Haptics nativos** (tem `hapticGrammar.ts` — ligar em Capacitor Haptics).
5. **In-App Purchase alternativa** (Apple exige IAP pra assinatura — integra `@revenuecat/purchases-capacitor`).
6. **Splash + app icon** assinados.
7. **TestFlight + Play Internal** subindo.

### GATE ✅
- App instalado em iPhone e Android real.
- Push notification chega nativo.
- Compra via IAP funciona em sandbox.

---

## 🎯 FASE 9 — LANDING + CAPTURA + OG DINÂMICO
**Gate para Nível 9.** 🗄️ **Requer SQL.**

### Objetivo
Ter algo pra mandar pra stranger na internet.

### Tarefas
1. **Landing pública** em `/` (quando deslogado): proposta + prova social + CTA "Descobrir meu arquétipo" (leva ao onboarding).
2. **Rota pública `/a/[archetype]`:** cada arquétipo tem landing SEO-otimizada com descrição + "teste pra descobrir se você é X".
3. **OG images dinâmicas** via `@vercel/og`: `/api/og/archetype/[id]` gera PNG do card.
4. **Email capture** pré-login: "Quero ser avisado do closed beta" → tabela `waitlist`.
5. **Sharing upgrade:** cada share link inclui UTM + preview customizado.
6. **robots.txt + sitemap.xml** gerados.

### 🗄️ SQL pra rodar no Supabase
```sql
create table if not exists public.waitlist (
  id bigserial primary key,
  email text not null unique,
  source text,
  archetype_hint text,
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
create policy waitlist_insert_anon on public.waitlist
  for insert with check (true);
```

### GATE ✅
- Lighthouse score > 90 em `/` deslogado.
- Landing indexada no Google (teste `site:mindpractice.app`).
- 1 email na waitlist vindo de link compartilhado.

---

## 📊 FASE 10 — ANALYTICS + A/B + GROWTH LOOPS
**Nível 9.** 🗄️ **Requer SQL.**

### Objetivo
Parar de chutar. Começar a medir.

### Tarefas
1. **PostHog** integrado (gratuito self-hostable). Events: `signup`, `onboarding_complete`, `deck_started`, `deck_completed`, `archetype_unlocked`, `share_tapped`, `paywall_viewed`, `checkout_started`, `checkout_completed`, `churn`.
2. **Funnel views:** Acquisition → Activation (primeiro deck) → Retention (D1/D7/D30) → Revenue → Referral.
3. **A/B framework simples:** `useExperiment('paywall_copy_v2')` retorna variant; PostHog rastreia.
4. **Dashboard interno** em `/admin` (só seu user_id): DAU, MAU, conversão free→paid, LTV estimado.
5. **Referral loop:** "ganhe 7 dias Pro por cada amigo que assinar" — tabela `referrals` + código único por user.

### 🗄️ SQL pra rodar no Supabase
```sql
create table if not exists public.referrals (
  id bigserial primary key,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid references public.profiles(id) on delete set null,
  code text not null unique,
  status text not null default 'pending'
    check (status in ('pending','signed_up','converted')),
  reward_granted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists referrals_referrer_idx
  on public.referrals (referrer_id);

alter table public.referrals enable row level security;
create policy refs_read_own on public.referrals
  for select using (auth.uid() = referrer_id);
```

### GATE ✅
- Funil D1/D7 mensurado por 14 dias consecutivos.
- 1 experimento A/B rodado com decisão clara.
- Referral gerou ≥ 1 signup real.

---

## 📣 FASE 11 — CLOSED BETA + BUILD-IN-PUBLIC
**Nível 9, contínuo.**

### Objetivo
Primeiros 100 usuários reais. Narrativa pública.

### Tarefas
1. **Closed beta** pela waitlist (100 slots, invite manual via email).
2. **Canal público:** escolha UM (Twitter/X, LinkedIn, Instagram). Post 3x/semana: métrica, aprendizado, bastidor.
3. **Feedback channel:** Discord ou Telegram privado pra beta-users. Bot que lê `feed_events` notifica milestones.
4. **Changelog público** em `/changelog` (gerado de `git log` filtrado por `feat:`).
5. **Métricas expostas:** página `/stats` pública com #users, #decks completed, #arquétipos descobertos (sem PII).
6. **Iteração semanal:** toda sexta, ler feedback → 1 fix + 1 feature pequena no sábado.

### GATE ✅
- 100 usuários ativos semanais.
- NPS > 40 em survey.
- 10% de conversão free→pro nos beta.

---

## 👑 FASE 12 — SOBERANIA: RECEITA E ESCALA
**Nível 10. Contínuo, até morrer.** 🗄️ **SQL conforme necessidade.**

### Objetivo
R$ 10k MRR. Depois R$ 50k. Depois você decide.

### Tarefas
1. **Content engine:** 2 decks novos por mês, com IA assistindo a escrita (prompt templates).
2. **Partnerships:** 3 terapeutas/coaches usando MindPractice com pacientes (B2B2C). Dashboard `/pro/` pra eles.
3. **Premium decks** avulsos (R$ 4,90 each) — "Relacionamento Tóxico", "Família Disfuncional", "Liderança".
4. **Internationalização:** PT-BR primeiro, depois ES e EN.
5. **Edge optimization:** CDN pra assets, ISR pra OG, cache agressivo.
6. **Observability:** Sentry + Better Stack logs + uptime monitoring.
7. **Legal:** TOS, Privacy Policy, LGPD compliance, CNPJ MEI → SA se precisar.

### GATE ✅ (marcos, não binário)
- R$ 10k MRR → nível 10 consolidado.
- R$ 50k MRR → contratar primeira pessoa.
- R$ 200k MRR → seed round opcional ou bootstrap pra sempre.

---

## 🧭 COMO CADA FASE É EXECUTADA (LOOP AGÊNTICO)

```
1. Você: "rodar Fase N"
2. Eu invoco superpowers:brainstorming → spec detalhado em docs/superpowers/specs/
3. Você revisa spec, aprova
4. Eu invoco superpowers:writing-plans → plan com tasks TDD em docs/superpowers/plans/
5. Você revisa plan, aprova
6. Eu invoco superpowers:subagent-driven-development → executa tasks, dispatch subagents, review, commit
7. Eu listo SQL migrations necessárias → você roda no Supabase SQL Editor
8. GATE check: tests + build + smoke em device real
9. Marca fase done neste roadmap, segue pra próxima
```

---

## 🚨 REGRAS DE OURO

1. **Não pular gate.** Persistência quebrada + paywall = dinheiro perdido + churn em vez de receita.
2. **Não acumular débito técnico por fase.** Cada fase fecha com lint/test/build verde.
3. **Dogfood semanal.** Todo domingo, VOCÊ joga o app como user real por 30min. Caderno de frictions.
4. **Meta da semana > feature da semana.** F11+ decide por métrica, não por vontade.
5. **Quando travar, cortar escopo.** Sempre existe a versão 0.5 que entrega 80% do valor.

---

## ✅ PRÓXIMA AÇÃO IMEDIATA

Fale **"rodar Fase 5"** que eu começo a execução agêntica de Design System + Telas Rituais.
Se quiser alterar qualquer fase, me fala antes — esse doc é vivo.

---

## 📌 STATUS

- **Fase 3 (Persistência Indestrutível):** ✅ **FECHADA em 2026-04-24**
  - 15 tasks executadas, 58 testes verdes, `tsc --noEmit` 0 erros, build 10 rotas OK.
  - `GameContext.tsx`: 324 → **142 LOC** (abaixo do target 150).
  - Novos módulos: `src/lib/gameState/{schema,defaults,migrations,normalize,persistence,sync}.ts`, `src/context/{gameReducer,useSocialFeed,useGameStatePersistence}.ts`, `src/components/SyncConflictModal.tsx`.
  - Schema Zod v3 com migrations v1→v2→v3; conflict matrix de 8 casos; debounce 500ms local + 2000ms cloud.
  - Commit final SHA: `af95ff6`.
  - **Nível 6 batido.**

- **Fase 4 (Motor Bayesiano):** ✅ **FECHADA em 2026-04-24**
  - 23 tasks executadas. Engine bayesiano em produção, pipeline legado completamente extirpado.
  - `Option.evidence` é o único formato; `weights/intent/baseWeights/applyDampenedWeights/CONTEXT_MODIFIERS/resolveWeights` removidos do código, dos JSON (502+256 campos) e dos types.
  - `CalibrationState` enxuto: `{ beliefs, totalResponses, toneHistory, snapshots }`. Schema Zod cleanup junto.
  - `RunReportCard` surfaces evidence per-answer; `DeckSnapshot.answers[]` carrega evidence persistente.
  - Hold-color das opções deriva de `getDominantAxisFromEvidence(option.evidence)`.
  - `archetypeDisplayState`: discovering/tendency/firm gating no `/perfil`.
  - Docs: `docs/authoring/evidence-guide.md` pra autores de deck.
  - Sanity tip do main: `tsc 0 erros`, `npm test 75/75`, `build 10 rotas`, `deck:validate 0 errors / 10 warnings (content-side)`.
  - **Nível 6 mantido.**
