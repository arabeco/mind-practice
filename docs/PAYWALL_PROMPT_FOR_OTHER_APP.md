# Prompt pronto — Implementar paywall em outro app

Cola este prompt na nova IA + manda o arquivo `PAYWALL_PLAYBOOK_HARDENED_V2.md` junto.

---

## ✂️ COPIA DAQUI

Você vai implementar o sistema completo de paywall (Google Play Billing + Edge Function Supabase + Plugin nativo Java) seguindo o documento de referência **PAYWALL_PLAYBOOK_HARDENED_V2.md** (anexado).

### Regras importantes antes de começar

1. **O playbook V2 tem exemplos do MindPractice** (productIds `pro_monthly`, `founder_lifetime`, moeda `fichas`, etc). Esses são EXEMPLOS — substitua por valores do app abaixo. NÃO copie literal.

2. **Nunca libere benefit sem validar token server-side.** Cliente nunca é autoridade. Sempre Plugin Java → Edge Function → RPC.

3. **Não execute nada sem minha confirmação explícita.** Pra cada etapa, me mostre o código antes de salvar/commitar. Aguarde "ok" ou "vai" antes de seguir.

4. **Quando eu pedir SQL ou comando bash, formate pronto pra colar** (sem instruções extras no meio).

5. **Stack obrigatório (não substitua):**
   - Capacitor 7 + Android nativo
   - Plugin Java custom com BillingClient v6.1.0 (NÃO use `@capgo/native-purchases` nem `@revenuecat/*` — perde controle de consume/acknowledge)
   - Edge Function Deno + `jose` pra JWT
   - Supabase RPC com `security definer`, `for update` lock, `revoke from public`

---

### Preencha estes valores ANTES de começar

```
# Identificação do app
APP_NAME              = (ex: Elite 2050, Glyph, MeuApp)
PACKAGE_NAME          = com.________      (formato: com.empresa.app)
WEB_DIR               = (ex: dist, out, build)  ← o que o npm run build gera

# Supabase
SUPABASE_PROJECT_REF  = (do dashboard Supabase)
SUPABASE_URL          = https://________.supabase.co

# Moeda virtual (se tiver)
CURRENCY_NAME         = (ex: fichas, gold, gems, coins, OU "nenhuma")
CURRENCY_STORAGE      = (ex: "game_state.state_json->'wallet'->>'fichas'",
                       OU "user_profiles.gold" coluna direta,
                       OU "não aplicável")

# Produtos no Google Play (escolha quais existem; vazio = não tem)
# Packs de moeda (consumable, IAP real)
PACK_1_ID             = (ex: pack_gold_100)
PACK_1_PRICE_BRL      = (ex: 4.90)
PACK_1_BENEFIT_AMOUNT = (ex: 100)

PACK_2_ID             = (ex: pack_gold_300)
PACK_2_PRICE_BRL      = (ex: 12.90)
PACK_2_BENEFIT_AMOUNT = (ex: 350)

PACK_3_ID             = (ex: pack_gold_700)
PACK_3_PRICE_BRL      = (ex: 24.90)
PACK_3_BENEFIT_AMOUNT = (ex: 800)

# Tier recorrente (subscription, IAP real)
TIER_MONTHLY_ID       = (ex: premium_30d, pro_monthly, OU "não tem")
TIER_MONTHLY_PRICE    = (ex: 14.90)
TIER_MONTHLY_DAYS     = (ex: 30)
TIER_MONTHLY_TRIAL    = (ex: 7 dias, OU "sem trial")

# Tier vitalício (one-time non-consumable, IAP real OU só via moeda)
TIER_LIFETIME_ID      = (ex: founder_lifetime, vip_forever, OU "não tem")
TIER_LIFETIME_PRICE   = (ex: 89.00, OU "só com moeda")
TIER_LIFETIME_COST_CURRENCY = (ex: 8000, OU "não vende com moeda")

# Tier mensal comprável com moeda (atalho economia híbrida)
TIER_MONTHLY_COST_CURRENCY = (ex: 1000, OU "só IAP")

# Tabelas existentes que vão ser tocadas
USER_PROFILES_TABLE   = (ex: user_profiles, profiles)
SUBSCRIPTIONS_TABLE   = (ex: subscriptions — crie se não existe)
GAME_STATE_TABLE      = (ex: game_state — só se usar jsonb pra moeda)
```

---

### Ordem de execução (8 passos)

**NÃO comece o passo seguinte sem minha confirmação ✅.**

| # | Passo | Entrega |
|---|---|---|
| 1 | Catálogo TypeScript | `src/constants/billingCatalog.ts` com os produtos preenchidos |
| 2 | RPC pra compra com moeda virtual (se aplicável) | `supabase/migrations/<data>-currency-spend.sql` + SQL pronto pra colar |
| 3 | Plugin Java + MainActivity + build.gradle | Em `android/app/src/main/java/<package>/billing/` |
| 4 | Bridge TypeScript | `src/lib/nativeBilling.ts` |
| 5 | RPC `grant_mobile_purchase` + tabela `mobile_purchases` | SQL pronto pra colar |
| 6 | Edge Function `verify-google-play-purchase` | `supabase/functions/verify-google-play-purchase/index.ts` |
| 7 | UI `/assinatura` + helpers (`iapPurchase.ts`, `currencyPurchase.ts`) | Página completa com banners de status |
| 8 | `PaywallModal` contextual | Modal que detecta saldo e oferece caminho otimizado |

---

### Padrões defensivos obrigatórios (do v2)

Ao escrever cada peça, garanta:

**Edge Function:**
- ✅ Auth via Bearer obrigatório
- ✅ Catálogo HARDCODED server-side (cross-check productCode → productId)
- ✅ Cache de Google access token (1h em memória)
- ✅ Endpoints separados: `/products/` (consumable) vs `/subscriptionsv2/` (sub)
- ✅ try/catch em `:consume` e `:acknowledge` (falha NÃO derruba credit)
- ✅ ALLOWED_ORIGINS específico (`capacitor://localhost`, etc)

**RPC SQL:**
- ✅ `security definer` + `set search_path = public, auth, extensions`
- ✅ `for update` lock em rows que vão ser modificadas
- ✅ Idempotência via `purchase_token` UNIQUE
- ✅ `revoke all from public, anon, authenticated; grant execute to service_role`
- ✅ Validações de input (NULL, format, range)

**Plugin Java:**
- ✅ `ProductDetails` cache
- ✅ `pendingConnectionActions` queue pra reconnect
- ✅ `needsServerReconciliation: true` em todo payload de purchase
- ✅ try/catch em `purchaseProduct` retorna estado normalizado

**UI:**
- ✅ Banner amarelo "Setup pendente" enquanto secrets não estão configurados
- ✅ Detecta `canUseNativeStoreBilling()` antes de mostrar botões IAP
- ✅ Caminho via moeda funciona mesmo sem Google Play setup
- ✅ Loading states + dismiss limpos

---

### O que NÃO fazer

- ❌ Não rode `npx supabase functions deploy` sem eu pedir
- ❌ Não rode SQL no Supabase Studio por mim — me dê o SQL e EU rodo, depois te mando o resultado
- ❌ Não use `@capgo/native-purchases` nem `@revenuecat/*` (decisão final, não relitigue)
- ❌ Não escreva tier do cliente direto no Supabase — mesmo com RLS, é falsificável. Sempre via Edge Function.
- ❌ Não chame Google Play API sem cache de access token
- ❌ Não cole serviço account JSON em chat/terminal

---

### Validação a cada passo

Depois de cada passo, rode (eu vou rodar):

```bash
npx tsc --noEmit            # 0 erros esperado
npm test --silent           # tudo passando
npm run build               # verde
```

E me mostre o output antes de seguir.

---

### Ações manuais minhas (anote o que eu preciso fazer fora do código)

Você vai dizer o que eu preciso fazer manualmente em:
- Google Cloud Console (criar service account, ativar API)
- Play Console (criar app, cadastrar produtos, license testers)
- Supabase Dashboard (rodar SQL, deploy edge function, setar secrets)

Liste cada ação com comando exato OU passos no UI.

---

### Quando eu disser "vai", responda em formato

```
## Passo X: <nome>

[código completo do arquivo OU SQL pronto pra colar]

[explicação de 2-3 linhas do que ele faz]

[se precisa ação manual minha, lista]

Próximo: <Passo X+1: nome>. Me confirma com "vai pro X+1" ou ajuste.
```

Sem firulas. Direto.

---

**Tá pronto. Comece perguntando os valores do bloco "Preencha estes valores" — depois que eu responder, parta pro Passo 1.**

## ✂️ COPIA ATÉ AQUI
