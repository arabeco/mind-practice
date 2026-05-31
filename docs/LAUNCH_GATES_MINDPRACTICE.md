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
VERCEL_URL            = https://mind-practice-two.vercel.app   # confirmado no Supabase Auth Site URL
LOGIN_COM_GOOGLE?     = sim                            # AuthContext: signInWithGoogle (OAuth) + email/senha
PRODUTOS:
  - productId = fichas_100   | basePlanId = (n/a)        | tipo = consumable     (100 fichas)
  - productId = fichas_300   | basePlanId = (n/a)        | tipo = consumable     (350 fichas)
  - productId = fichas_700   | basePlanId = (n/a)        | tipo = consumable     (800 fichas)
  - productId = pro_monthly  | basePlanId = ❓ confirmar  | tipo = subscription   (Pro 30d, R$14,90)
SITE_MAE_URL          = https://arabeco.github.io      # paginas legais hospedadas no GitHub Pages
  Privacidade  = https://arabeco.github.io/privacidade-mind-practice.html
  Termos       = https://arabeco.github.io/termos-mind-practice.html
  Exclusao     = https://arabeco.github.io/mind-practice/exclusao.html
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

## Gate 9 — Conformidade & Nuvem (pré-loja) — ✅ quase fechado (faltam assets de loja)

**Site-mãe / Conformidade legal:** (GitHub Pages — arabeco.github.io)
- [x] Política de Privacidade publicada — https://arabeco.github.io/privacidade-mind-practice.html
- [x] Termos de Uso publicados — https://arabeco.github.io/termos-mind-practice.html
- [x] Página/fluxo de **Exclusão de conta** — https://arabeco.github.io/mind-practice/exclusao.html

**Google Cloud (🔁 1× pra todos):**
- [x] Projeto Cloud — configurado (user confirmou "no cloud já está")
- [x] **Google Play Android Developer API** habilitada (user confirmou)
- [x] **Service Account** + chave JSON gerada (JSON já está no secret da Supabase)
- [x] OAuth Client (LOGIN_COM_GOOGLE = sim) — Client ID 857606127673-... + Secret OK; callback `https://clkorbtmxzodttxnwldi.supabase.co/auth/v1/callback` registrado

**Supabase (por app):**
- [x] SQL rodado — `mobile_purchases` + RPC + `purchase_tier_with_fichas` + drop das policies de client-write (2026-05-30, confirmado: sobrou só `subs_read_own`)
- [x] Edge Function deployada — `verify-google-play-purchase` no ar (deploy 2026-05-30 via CLI; import jose em esm.sh)
- [x] Secret `GOOGLE_PLAY_PACKAGE_NAME` — setado (30 May 20:19) = com.mindpractice.app
- [x] Secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — setado (30 May 20:19)
- [x] `ALLOWED_ORIGINS` com VERCEL_URL — https://mind-practice-two.vercel.app adicionado e redeployado (2026-05-30)
- [x] Provider Google habilitado no Supabase Auth (login Google funciona)

**Build / Assinatura:**
- [x] Keystore gerada — `android/mindpractice-release.jks` (alias `mindpractice_release`, RSA 2048). Config via `key.properties` + signingConfig no build.gradle. Fingerprints em `docs/SIGNING_KEYS_STATUS.md`.
- [x] AAB de release assinada — `app-release.aab` gerado e assinado (Billing 8.0.0, `MINDPRAC.RSA`)
- [ ] ⚠️ **Backup da .jks + senha fora do PC** (Drive/gerenciador) — FAZER
- [ ] ⚠️ **Senha `***REDACTED***` está no histórico git LOCAL** — não dar push antes de limpar/trocar

**Assets de loja (offline):**
- [ ] Ícone, feature graphic, screenshots, descrição — pendente

- [~] **GATE:** quase — só faltam os assets de loja (e backup da keystore)

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

## ✅ Já concluído (Gates 1–9, exceto assets)
- Produto + billing em código (Gates 1–8)
- 3 URLs legais publicados (privacidade/termos/exclusão no arabeco.github.io)
- Google Cloud + Service Account + OAuth + secrets + Edge Function deployada + SQL
- Keystore `mindpractice-release.jks` + AAB assinado (Billing 8.0.0)

## 🎯 Próximas ações concretas (ordem)
1. ⚠️ **Backup da keystore** (`mindpractice-release.jks`) + senha fora do PC. SEM ISSO, perda = nunca mais atualiza o app.
2. ⚠️ **Resolver a senha no histórico git** antes do `git push` (trocar senha da keystore OU limpar histórico).
3. **Assets de loja:** ícone, feature graphic, screenshots, descrição curta/longa.
4. **Play Console (Gate 10):** criar app `com.mindpractice.app` → store listing (com os 3 URLs) → Data Safety + Content rating → criar produtos (fichas_100/300/700 + pro_monthly) → subir AAB em Closed testing (liga o relógio dos 14 dias).
5. **Vincular Service Account no Play Console** (Acesso à API) — senão a função toma 401 do Google.
6. **Smoke real:** comprar como license tester → conferir `mobile_purchases` no banco.

## Mapa de dependências
```
Gates 1–8 : ✅ feito (produto + billing em código)
Gate 9    : ✅ quase — falta só assets de loja + backup keystore
Gate 10   : ⬜ Play Console (app, produtos, AAB→Closed, 20/14d) + vincular SA + smoke real
```
