# Blueprint 10 Gates — MindPractice (preenchido 2026-05-30)

> Instância do template `docs/LAUNCH_GATES_TEMPLATE.md` pro MindPractice.
> Status auditado a partir do código em 2026-05-30. Itens de Play Console e
> de console externo (Vercel/Google Cloud) que não dá pra confirmar pelo repo
> ficam marcados com ❓ — você confirma e troca o status.

---

## 0. Variáveis do app

```
APP_NOME              = MindPractice
PACKAGE_NAME          = com.mindpractice.app          # capacitor.config.ts:16
SUPABASE_PROJECT_REF  = clkorbtmxzodttxnwldi          # do .env.local
SUPABASE_URL          = https://clkorbtmxzodttxnwldi.supabase.co
VERCEL_URL            = https://mindpractice.app       # ❓ confirmar domínio real (visto no ALLOWED_ORIGINS)
LOGIN_COM_GOOGLE?     = sim                            # AuthContext: signInWithGoogle (OAuth) + email/senha
PRODUTOS:
  - productId = fichas_100   | basePlanId = (n/a)        | tipo = consumable     (100 fichas)
  - productId = fichas_300   | basePlanId = (n/a)        | tipo = consumable     (350 fichas)
  - productId = fichas_700   | basePlanId = (n/a)        | tipo = consumable     (800 fichas)
  - productId = pro_monthly  | basePlanId = ❓ confirmar  | tipo = subscription   (Pro 30d, R$14,90)
SITE_MAE_URL          = https://mindpractice.app       # ❓ confirmar onde ficam privacidade/termos/exclusão
```

> Nota de produto: além dos IAP acima, existem 2 "produtos" comprados **só com fichas**
> (gasto interno, sem Google Play): `pro` (1000 fichas, 30d) e `founder` (8000 fichas, vitalício)
> via RPC `purchase_tier_with_fichas`. Não entram no Play Console.

### Legenda
`[ ]` pendente · `[~]` em andamento · `[x]` feito · `[N/A]` não se aplica · `❓` confirmar fora do repo

---

## Gate 1 — Ideia & Escopo Travado — ✅
- [x] Manifesto / "superpoder" do app escrito *(docs/plans + roadmap)*
- [x] Fluxo lógico de telas e decisões desenhado
- [x] Stack confirmada (Next.js 16 + Supabase + Vercel + Capacitor 7)
- [x] Variáveis da seção 0 preenchidas (package, IDs, tipos)
- [x] **GATE:** escopo travado, IDs de produto decididos

## Gate 2 — Infraestrutura — ✅
- [x] Repo + commits + git ligado ao GitHub (`github.com/arabeco/mind-practice`, branch `main`) — confirmado
- [x] Design system / Tailwind 4 configurado *(docs/design + ui primitives)*
- [x] Supabase ativo: tabelas base, RLS, Auth *(schema.sql + migrations)*
- [x] Deploy Vercel respondendo *(❓ confirmar URL viva)*
- [x] **GATE:** ambiente local + nuvem em harmonia

## Gate 3 — Design — ✅
- [x] Paleta + tipografia no código *(design tokens)*
- [x] Componentes base (cards, botões, glass, modais) *(src/components/ui)*
- [x] Navegação/menus padronizados
- [x] **GATE:** estética premium consolidada

## Gate 4 — Fluxo — ✅
- [x] Roteamento completo entre telas (mundo, decks, campanha, perfil, assinatura...)
- [x] Onboarding + telas core navegáveis *(OnboardingGate.tsx)*
- [x] **GATE:** caminho do usuário percorrível

## Gate 5 — Engine & Regras — ✅
- [x] Tipos TS sem erros — **`tsc --noEmit` limpo** (verificado 2026-05-30)
- [x] Regras core / motor bayesiano implementados *(specs + plans)*
- [x] Smoke tests / simulações — **119/119 testes passando** (commit F7-IAP)
- [x] **GATE:** cérebro do app estável

## Gate 6 — Persistência — ✅
- [x] Estado global integrado *(GameContext + gameReducer)*
- [x] Persistência local + hydration *(gameState schema versionado + migrations testadas)*
- [x] **GATE:** memória local indestrutível *(fase "persistencia-indestrutivel" no roadmap)*

## Gate 7 — Conexão — ✅
- [x] Login real funcionando *(Google OAuth + email/senha — AuthContext)*
- [x] Sync estado local ↔ Supabase *(lib/gameState/sync)*
- [x] RLS protegendo cada tabela *(schema.sql: select using auth.uid())*
- [~] Backup/perfil multi-dispositivo validado **por teste humano** — ❓ confirmar você testou em 2 devices
- [x] **GATE:** app conectado e seguro

## Gate 8 — Refino & Billing (código) — ✅ (billing pronto)
- [x] Sistema global de toasts *(components/Toast)*
- [~] Performance Lighthouse 90+ — ❓ não medido ainda
- [~] Build Capacitor em **dispositivo físico** — ❓ confirmar que abriu/testou no aparelho
- [x] Catálogo `billingCatalog.ts` = **fonte única** dos IDs (bate com seção 0)
- [x] Paywall chama **compra nativa** (não libera no client) *(iapPurchase → nativeBilling → StoreBilling.java)*
- [x] Edge Function `verify-google-play-purchase` escrita (Google API v3, products + subscriptionsv2)
- [x] RPC `grant_mobile_purchase` idempotente (lock + `revoke` do client)
- [x] SQL das tabelas escrito (`mobile_purchases` + RPC)
- [x] **Zero billing morto** (removido `iap.ts` legado + capgo, 2026-05-30) e **zero secret na Vercel**
- [x] **GATE:** billing 100% pronto em código

---
### 🚧 DAQUI É LANÇAMENTO — Play Console só no Gate 10 ↓
---

## Gate 9 — Conformidade & Nuvem (pré-loja) — [~] em andamento

**Site-mãe / Conformidade legal:**
- [ ] Política de Privacidade publicada (URL) — ❓ pendente
- [ ] Termos de Uso publicados — ❓ pendente
- [ ] Página/fluxo de **Exclusão de conta** (URL) — ❓ pendente

**Google Cloud (🔁 1× pra todos):**
- [~] Projeto Cloud — existem vários `gen-lang-client-*` (lixo do AI Studio) + `glyph-489315`.
      ⚠️ **Falta um projeto NOMEADO limpo pro MindPractice.** (ver memória: 1 app = 1 projeto)
- [ ] **Google Play Android Developer API** habilitada — ❓
- [ ] **Service Account** + chave JSON gerada — ❓ (é compartilhada entre apps)
- [x] OAuth Client (LOGIN_COM_GOOGLE = sim) — login Google já funciona, então existe ❓ confirmar redirect

**Supabase (por app):**
- [x] SQL rodado — `mobile_purchases` + RPC + `purchase_tier_with_fichas` + drop das policies de client-write (2026-05-30, confirmado: sobrou só `subs_read_own`)
- [x] Edge Function deployada — `verify-google-play-purchase` no ar (deploy 2026-05-30 via CLI; import jose em esm.sh)
- [x] Secret `GOOGLE_PLAY_PACKAGE_NAME` — setado (30 May 20:19) = com.mindpractice.app
- [x] Secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — setado (30 May 20:19)
- [~] `ALLOWED_ORIGINS` com VERCEL_URL — default inclui mindpractice.app; ❓ confirmar domínio real
- [x] Provider Google habilitado no Supabase Auth (login Google funciona)

**Build / Assinatura:**
- [ ] Keystore / Play App Signing gerada e guardada — ❓
- [ ] AAB de release assinada — ❓

**Assets de loja (offline):**
- [ ] Ícone, feature graphic, screenshots, descrição — ❓

- [ ] **GATE:** ainda não — faltam políticas, secrets Google Play, keystore e assets

## Gate 10 — Play Console & Produto Vivo — [ ] não iniciado
**Conta & vínculo (🔁 1× pra todos):**
- [ ] Conta de desenvolvedor Play ativa ($25) — ❓
- [ ] Payments / Merchant profile — ❓
- [ ] API access → vincular Service Account — ❓

**App (por app):**
- [ ] Criar app (nome + com.mindpractice.app)
- [ ] Store listing + Privacy Policy URL
- [ ] Data Safety + Content rating + Target audience + Ads declaration
- [ ] Criar produtos com IDs exatos (fichas_100/300/700 + pro_monthly + base plan)
- [ ] Subir AAB Internal → Closed testing
- [ ] License testers

**Validação real:**
- [ ] Comprar como license tester → benefício liberado
- [ ] Conferir no banco (`mobile_purchases` / wallet) — idempotência ok
- [ ] Reabrir → persiste · Restaurar sem cobrar de novo

**Trava de produção:**
- [ ] ⏳ 20 testers × 14 dias (Closed testing)
- [ ] Promover pra Produção
- [ ] ASO
- [ ] Monitoramento + tráfego
- [ ] **GATE:** receita ativa

---

## 🎯 Próximas ações concretas (ordem)
1. **Publicar Privacidade + Termos + Exclusão de conta** (3 URLs) — bloqueia Play.
2. **Google Cloud:** criar projeto nomeado `mindpractice`, habilitar Android Publisher API, gerar Service Account + JSON (essa JSON é reusada nos 5 apps).
3. **Supabase secrets:** setar `GOOGLE_PLAY_PACKAGE_NAME=com.mindpractice.app` + `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, depois trocar `SECRETS_NOT_CONFIGURED_NOTE` → `false` em `src/app/assinatura/page.tsx:36`.
4. **Confirmar deploy** da Edge Function.
5. **Keystore** + AAB assinada → subir em Closed testing (liga o relógio dos 14 dias).
6. Resto do Gate 10 (loja, produtos, smoke real).

## Mapa de dependências
```
Gates 1–8 : ✅ feito (produto + billing em código)
Gate 9    : 🔧 em andamento — falta políticas, Google Cloud SA, secrets, keystore, assets
Gate 10   : ⬜ não iniciado — Play Console + 20/14d + produção
```
