# Playbook — Paywall + Google Play Billing + Supabase (v2 Hardened)

> Versão endurecida do playbook Elite 2050, incorporando defesas do GOL 1.006 (rodando em produção). Use como template canônico pros 6 apps.
>
> **Status:** v2 escrita em 2026-05-24 baseada em código GOL 1.006 testado em produção.

---

## Resultado esperado

Ao fim do processo, o app tem:

- Build Android via Capacitor (AAB assinada pronta pra Play Console)
- Compra nativa via Google Play Billing Client v6+
- **Validação server-side dupla**: Google Play Developer API (autoridade externa) + RPC Postgres (defesa em profundidade)
- Saldo/passe/tier liberado **somente após** confirmação server-side
- Idempotência **dupla**: `purchase_token` UNIQUE em `mobile_purchases` + RPC com `for update` lock
- Google Auth via Supabase OAuth
- Play Console com produtos + license testers configurados

---

## 1. Travar IDs antes de codar

Não comece nada sem definir:

```
APP_NAME=
PACKAGE_NAME=          ← formato com.empresa.app, único nas lojas
SUPABASE_PROJECT_REF=  ← do dashboard Supabase
SUPABASE_URL=          ← https://<REF>.supabase.co
GOOGLE_PLAY_PACKAGE_NAME=  ← igual ao PACKAGE_NAME
```

**Produtos** — escolha **DOIS tipos canônicos** (não misture sem necessidade):

| Tipo | Quando usar | Comportamento no app |
|---|---|---|
| `INAPP` consumable | Packs de moeda virtual (ouro, fichas) | Cliente "consome" após crédito; pode comprar de novo |
| `INAPP` entitlement | Founder vitalício, passe permanente | Não consome; perdura para sempre |
| `SUBS` subscription | Mensalidade Pro | Renovação gerenciada pelo Google |

**Regra:** se vai ter mensalidade gerenciada (com período, renovação, cancelamento), use `SUBS`. Senão, use `INAPP`.

**Naming convention** (use sempre o mesmo padrão entre apps):

```
{appprefix}_{tipo}_{detalhe}
ex: glyph_gold_100, elite2050_gold_100, mindpractice_pro_monthly
```

---

## 2. Stack obrigatório (não substitua)

```
@capacitor/core@^7
@capacitor/android@^7
@capacitor/cli@^7 (dev)
+ Java 17 JDK (vem com Android Studio)
+ Android Studio (latest)
+ Capacitor Plugin custom Java (NÃO usar abstrações tipo @capgo/native-purchases — perde controle de :consume/:acknowledge)
```

**Por quê plugin custom em vez de abstração:**
- Controle granular sobre `:consume` (consumable) vs `:acknowledge` (entitlement/subscription)
- Cache de `ProductDetails` (preço local em tempo real)
- Queue de `pendingConnectionActions` (retry automático se BillingClient cair)
- Restore via `queryPurchasesAsync` (Apple exige botão "Restaurar Compras")

---

## 3. Capacitor — setup

`capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.empresa.app',
  appName: 'NomeDoApp',
  webDir: 'out',
};

export default config;
```

Sequência:
```bash
npm run build           # gera web bundle
npx cap add android     # cria pasta android/
npx cap sync android    # copia bundle + plugins
```

`android/app/build.gradle` precisa ter:
```gradle
dependencies {
    implementation 'com.android.billingclient:billing:6.1.0'
}
```

---

## 4. Plugin nativo Android (StoreBilling)

Padrão GOL 1.006 — **copiar essa estrutura**, adaptar package:

**Localização:**
```
android/app/src/main/java/com/empresa/app/billing/StoreBillingPlugin.java
```

**Métodos expostos** (4 mínimo):

```java
@CapacitorPlugin(name = "StoreBilling")
public class StoreBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    @PluginMethod
    public void getStatus(PluginCall call) { ... }
    // retorna { available, connected, canMakePayments, reason, responseCode }

    @PluginMethod
    public void getProduct(PluginCall call) { ... }
    // input: { productId, kind: 'consumable'|'entitlement'|'subscription' }
    // retorna { productId, title, description, formattedPrice, offerTokenAvailable }

    @PluginMethod
    public void purchaseProduct(PluginCall call) { ... }
    // input: { productId, kind }
    // retorna { purchaseState, orderId, purchaseToken, packageName, products[], needsServerReconciliation: true }

    @PluginMethod
    public void getActivePurchases(PluginCall call) { ... }
    // retorna { purchases: [...] }  ← usado pra restore
}
```

**Patterns defensivos obrigatórios:**

1. **`ensureConnection(onReady, onError)`** — todo método espera conexão BillingClient antes de agir. Se desconectado, enfileira em `pendingConnectionActions`, reconecta, drena queue.

2. **`cachedProductDetails: Map<String, ProductDetails>`** — evita query repetida pro Google.

3. **`pendingPurchaseCall`** — `purchaseProduct` é assíncrono (resposta vem via `PurchasesUpdatedListener.onPurchasesUpdated`). Salva o `PluginCall` pra resolver/rejeitar quando callback chegar.

4. **Tipo dinâmico** — método aceita `kind` e usa `BillingClient.ProductType.INAPP` ou `SUBS`. Não hardcode.

5. **Resultado normalizado** — sempre retornar `needsServerReconciliation: true` no payload pra cliente saber que TEM que chamar Edge Function.

`MainActivity.java` precisa registrar:

```java
@Override
public void onCreate(Bundle savedInstanceState) {
    registerPlugin(StoreBillingPlugin.class);
    super.onCreate(savedInstanceState);
}
```

---

## 5. JS bridge (TypeScript)

`src/lib/nativeBilling.ts`:

```ts
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeStoreBillingPurchaseResult {
    platform: 'android';
    purchaseState: 'pending' | 'purchased';
    orderId: string;
    purchaseToken: string;
    acknowledged: boolean;
    consumed: boolean;
    packageName: string;
    products: string[];
    needsServerReconciliation: boolean;
}

interface StoreBillingPlugin {
    getStatus(): Promise<NativeStoreBillingStatus>;
    getProduct(options: { productId: string; kind: BillingMonetizationKind }): Promise<NativeStoreBillingProduct>;
    purchaseProduct(options: { productId: string; kind: BillingMonetizationKind }): Promise<NativeStoreBillingPurchaseResult>;
    getActivePurchases(): Promise<{ purchases: NativeStoreBillingPurchaseResult[] }>;
}

const StoreBilling = registerPlugin<StoreBillingPlugin>('StoreBilling');

export const canUseNativeStoreBilling = (): boolean =>
    Capacitor.isNativePlatform?.() === true &&
    String(Capacitor.getPlatform?.() || '').toLowerCase() === 'android';

const normalizePluginError = (err: unknown): Error => {
    if (err instanceof Error) return err;
    if (typeof err === 'string') return new Error(err);
    if (err && typeof err === 'object' && 'message' in err) return new Error(String((err as any).message));
    return new Error('Native billing indisponivel');
};

export const purchaseNativeProduct = async (
    productId: string,
    kind: BillingMonetizationKind,
): Promise<NativeStoreBillingPurchaseResult> => {
    if (!canUseNativeStoreBilling()) throw new Error('Disponivel apenas no app');
    try {
        return await StoreBilling.purchaseProduct({ productId, kind });
    } catch (err) {
        throw normalizePluginError(err);
    }
};
```

---

## 6. Catálogo de billing

`src/constants/billingCatalog.ts`:

```ts
export type BillingMonetizationKind = 'consumable' | 'entitlement' | 'subscription';

export interface BillingProduct {
    code: string;
    googlePlayProductId: string;
    appStoreProductId: string;
    kind: BillingMonetizationKind;
    priceBrl: number;
    benefit: {
        kind: 'gold' | 'tier' | 'pass';
        amount?: number;
        tier?: string;
        durationDays?: number;
    };
}

export const BILLING_CATALOG: Record<string, BillingProduct> = {
    pack_gold_100: {
        code: 'pack_gold_100',
        googlePlayProductId: 'app_gold_100',
        appStoreProductId: 'com.empresa.app.gold.pack100',
        kind: 'consumable',
        priceBrl: 5,
        benefit: { kind: 'gold', amount: 100 },
    },
    pro_monthly: {
        code: 'pro_monthly',
        googlePlayProductId: 'pro_monthly',
        appStoreProductId: 'com.empresa.app.subscription.pro',
        kind: 'subscription',
        priceBrl: 14.9,
        benefit: { kind: 'tier', tier: 'pro', durationDays: 30 },
    },
    founder_lifetime: {
        code: 'founder_lifetime',
        googlePlayProductId: 'founder_lifetime',
        appStoreProductId: 'com.empresa.app.founder.lifetime',
        kind: 'entitlement',
        priceBrl: 89,
        benefit: { kind: 'tier', tier: 'founder' },
    },
};
```

**Regra:** catálogo é a **fonte única**. Edge Function valida que o `productId` recebido bate com o do catálogo. RPC SQL valida de novo (defesa em profundidade).

---

## 7. BillingCheckoutGate (UI)

`src/components/BillingCheckoutGate.tsx` — componente que decide:

```
- Se !canUseNativeStoreBilling() → mostra "Disponível apenas no app" + link pra loja
- Se !logado → mostra "Faça login pra comprar"
- Senão → renderiza children (botões de compra reais)
```

Fluxo do botão de compra:

```ts
const handlePurchase = async (productCode: string) => {
    const product = BILLING_CATALOG[productCode];
    setSubmitting(productCode);

    try {
        // 1. Compra nativa
        const result = await purchaseNativeProduct(product.googlePlayProductId, product.kind);
        if (result.purchaseState !== 'purchased') {
            throw new Error('Compra nao confirmada pelo Google');
        }

        // 2. Server-side validation OBRIGATÓRIA
        const verify = await callEdgeFunction('verify-google-play-purchase', {
            productCode: product.code,
            productId: result.products[0] ?? product.googlePlayProductId,
            purchaseToken: result.purchaseToken,
            orderId: result.orderId,
            packageName: result.packageName,
            platform: 'android',
            kind: product.kind,
        });

        if (!verify.success) throw new Error(verify.error ?? 'Validacao server falhou');

        // 3. Refetch state local
        await refreshSnapshot();
        toast.success('Compra confirmada');
    } catch (err) {
        if (err.message?.includes('cancel')) return;
        toast.error(err.message);
    } finally {
        setSubmitting(null);
    }
};
```

**Regra de ouro do GOL:**
> Nunca libere saldo/tier só porque o cliente disse que comprou. SEMPRE valide token no servidor.

---

## 8. SQL — tabelas e RPCs

### 8.1. Tabela `mobile_purchases` (audit log)

```sql
create table if not exists public.mobile_purchases (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null,
  product_id text not null,
  purchase_token text not null unique,
  order_id text,
  package_name text not null,
  platform text not null check (platform in ('android','ios')),
  purchase_state int,
  acknowledged boolean default false,
  consumed boolean default false,
  benefit_kind text,
  benefit_amount numeric,
  benefit_tier text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

create index mobile_purchases_user_idx on public.mobile_purchases(user_id, created_at desc);
create index mobile_purchases_token_idx on public.mobile_purchases(purchase_token);

alter table public.mobile_purchases enable row level security;

create policy mobile_purchases_read_own on public.mobile_purchases
  for select using (auth.uid() = user_id);
-- Sem policy de insert/update — service role apenas (via Edge Function).
```

### 8.2. RPC `grant_mobile_purchase` (security definer, idempotente)

```sql
create or replace function public.grant_mobile_purchase(
    p_user_id uuid,
    p_product_code text,
    p_product_id text,
    p_purchase_token text,
    p_order_id text,
    p_package_name text,
    p_platform text default 'android',
    p_benefit_kind text default null,
    p_benefit_amount numeric default null,
    p_benefit_tier text default null,
    p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    v_existing public.mobile_purchases%rowtype;
    v_purchase_id bigint;
begin
    if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
    if nullif(trim(p_purchase_token), '') is null then raise exception 'TOKEN_REQUIRED'; end if;
    if nullif(trim(p_product_code), '') is null then raise exception 'PRODUCT_CODE_REQUIRED'; end if;
    if nullif(trim(p_product_id), '') is null then raise exception 'PRODUCT_ID_REQUIRED'; end if;

    -- Idempotência via purchase_token UNIQUE + lock
    select * into v_existing
    from public.mobile_purchases
    where purchase_token = p_purchase_token
    for update;

    if found then
        if v_existing.user_id <> p_user_id then
            raise exception 'TOKEN_ALREADY_USED';
        end if;
        return jsonb_build_object('success', true, 'duplicate', true, 'purchase_id', v_existing.id);
    end if;

    -- Audit log
    insert into public.mobile_purchases (
        user_id, product_code, product_id, purchase_token,
        order_id, package_name, platform,
        benefit_kind, benefit_amount, benefit_tier,
        metadata, validated_at
    ) values (
        p_user_id, p_product_code, p_product_id, p_purchase_token,
        p_order_id, p_package_name, p_platform,
        p_benefit_kind, p_benefit_amount, p_benefit_tier,
        p_metadata, now()
    )
    returning id into v_purchase_id;

    -- Aplica benefício
    case p_benefit_kind
        when 'gold' then
            update public.user_profiles
            set gold = coalesce(gold, 0) + p_benefit_amount,
                updated_at = now()
            where id = p_user_id;
        when 'tier' then
            insert into public.subscriptions (
                user_id, tier, status, current_period_end, updated_at
            ) values (
                p_user_id,
                p_benefit_tier,
                'active',
                case
                    when p_metadata->>'duration_days' is not null
                    then now() + (p_metadata->>'duration_days')::int * interval '1 day'
                    else null
                end,
                now()
            )
            on conflict (user_id) do update
            set tier = excluded.tier,
                status = 'active',
                current_period_end = excluded.current_period_end,
                updated_at = now();
        else
            null;
    end case;

    return jsonb_build_object(
        'success', true,
        'duplicate', false,
        'purchase_id', v_purchase_id,
        'benefit_kind', p_benefit_kind,
        'benefit_amount', p_benefit_amount,
        'benefit_tier', p_benefit_tier
    );
end;
$$;

revoke all on function public.grant_mobile_purchase from public, authenticated, anon;
grant execute on function public.grant_mobile_purchase to service_role;
```

**Patterns defensivos:**
- `security definer` + `search_path` fixo → previne schema spoofing
- `for update` lock → previne race em retries concorrentes
- `revoke from public` → só service role chama
- Idempotência por token UNIQUE
- Benefit kind dispatcher centralizado

---

## 9. Edge Function `verify-google-play-purchase`

`supabase/functions/verify-google-play-purchase/index.ts`:

### 9.1. Estrutura

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { SignJWT, importPKCS8 } from "npm:jose@5.9.6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_PLAY_PACKAGE_NAME = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME")!;
const GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") ?? "";
const GOOGLE_PLAY_OAUTH_CLIENT_ID = Deno.env.get("GOOGLE_PLAY_OAUTH_CLIENT_ID") ?? "";
const GOOGLE_PLAY_OAUTH_CLIENT_SECRET = Deno.env.get("GOOGLE_PLAY_OAUTH_CLIENT_SECRET") ?? "";
const GOOGLE_PLAY_REFRESH_TOKEN = Deno.env.get("GOOGLE_PLAY_REFRESH_TOKEN") ?? "";

const ANDROIDPUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedGoogleAccessToken: { token: string; expiresAt: number } | null = null;

const ALLOWED_ORIGINS = [
    `${SUPABASE_URL}`,
    "https://app.minhamarca.com",
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
];

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

### 9.2. Catálogo espelhado server-side

```ts
type ProductCatalog = {
    productId: string;
    kind: 'consumable' | 'entitlement' | 'subscription';
    benefit: { kind: string; amount?: number; tier?: string; durationDays?: number };
};

const CATALOG: Record<string, ProductCatalog> = {
    pack_gold_100: { productId: 'app_gold_100', kind: 'consumable', benefit: { kind: 'gold', amount: 100 } },
    pro_monthly: { productId: 'pro_monthly', kind: 'subscription', benefit: { kind: 'tier', tier: 'pro', durationDays: 30 } },
    founder_lifetime: { productId: 'founder_lifetime', kind: 'entitlement', benefit: { kind: 'tier', tier: 'founder' } },
};
```

**Crítico:** catálogo client-side **NUNCA é autoridade**. Edge Function tem seu próprio e valida match.

### 9.3. Access token com cache

```ts
const getGooglePlayAccessToken = async (): Promise<string> => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (cachedGoogleAccessToken && cachedGoogleAccessToken.expiresAt > nowSeconds + 60) {
        return cachedGoogleAccessToken.token;
    }

    let tokenResponse: Response;

    if (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
        const parsed = JSON.parse(GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
        const privateKey = await importPKCS8(parsed.private_key.replace(/\\n/g, "\n"), "RS256");
        const assertion = await new SignJWT({ scope: ANDROIDPUBLISHER_SCOPE })
            .setProtectedHeader({ alg: "RS256", typ: "JWT" })
            .setIssuer(parsed.client_email)
            .setSubject(parsed.client_email)
            .setAudience(GOOGLE_OAUTH_TOKEN_URL)
            .setIssuedAt(nowSeconds)
            .setExpirationTime(nowSeconds + 3600)
            .sign(privateKey);

        tokenResponse = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion,
            }),
        });
    } else if (GOOGLE_PLAY_OAUTH_CLIENT_ID && GOOGLE_PLAY_OAUTH_CLIENT_SECRET && GOOGLE_PLAY_REFRESH_TOKEN) {
        tokenResponse = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: GOOGLE_PLAY_OAUTH_CLIENT_ID,
                client_secret: GOOGLE_PLAY_OAUTH_CLIENT_SECRET,
                refresh_token: GOOGLE_PLAY_REFRESH_TOKEN,
            }),
        });
    } else {
        throw new Error("GOOGLE_PLAY_AUTH_NOT_CONFIGURED");
    }

    if (!tokenResponse.ok) throw new Error(`GOOGLE_PLAY_AUTH_FAILED:${tokenResponse.status}`);

    const payload = await tokenResponse.json();
    cachedGoogleAccessToken = {
        token: payload.access_token,
        expiresAt: nowSeconds + (payload.expires_in ?? 3600),
    };
    return payload.access_token;
};
```

### 9.4. Endpoints Google API separados por tipo

```ts
const productUrl = (packageName: string, productId: string, token: string, suffix = "") =>
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}${suffix}`;

const subscriptionV2Url = (packageName: string, token: string) =>
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`;
```

### 9.5. Handlers separados (resumido — ver código completo no GOL 1.006)

**Consumable/Entitlement:**
1. GET `productUrl(...)` → valida `purchaseState === 0`
2. RPC `grant_mobile_purchase`
3. **try/catch** POST `productUrl(..., ':consume')` (consumable) ou `':acknowledge'` (entitlement)
4. Falha em :consume/:acknowledge **não derruba** credit já feito

**Subscription:**
1. GET `subscriptionV2Url(...)` → valida `subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE'`
2. Verifica que `lineItems[].productId` bate com catálogo
3. RPC `grant_mobile_purchase` com `durationDays`
4. **try/catch** POST `subscriptionV2Url:acknowledge`

### 9.6. Handler principal

```ts
serve(async (req) => {
    const origin = req.headers.get('origin') || '';
    const corsHeaders = makeCorsHeaders(origin);

    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

    try {
        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (!token) throw new Error('AUTH_REQUIRED');

        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr || !userData.user) throw new Error('AUTH_INVALID');
        const userId = userData.user.id;

        const body = await req.json();
        const catalog = CATALOG[body.productCode];
        if (!catalog) throw new Error('UNKNOWN_PRODUCT_CODE');
        if (body.productId !== catalog.productId) throw new Error('PRODUCT_ID_MISMATCH');
        if (body.packageName !== GOOGLE_PLAY_PACKAGE_NAME) throw new Error('PACKAGE_MISMATCH');

        const accessToken = await getGooglePlayAccessToken();

        let result;
        if (catalog.kind === 'subscription') {
            result = await handleSubscription(body, userId, accessToken, catalog);
        } else {
            result = await handleConsumableOrEntitlement(body, userId, accessToken, catalog);
        }

        return jsonResponse(result, 200, corsHeaders);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[verify-google-play-purchase]', msg);
        return jsonResponse({ success: false, error: msg }, 400, corsHeaders);
    }
});
```

### 9.7. Deploy

```bash
npx supabase functions deploy verify-google-play-purchase --project-ref SEU_PROJECT_REF
```

---

## 10. Secrets Supabase

```bash
npx supabase secrets set GOOGLE_PLAY_PACKAGE_NAME="com.empresa.app" --project-ref REF
npx supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="$(cat service-account.json)" --project-ref REF
```

⚠️ **Nunca cole o JSON da service account em chat ou terminal compartilhado.** Use `--from-file` se Supabase CLI suportar, ou cole direto no dashboard.

---

## 11. Google Auth via Supabase

App:
```ts
await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/home` },
});
```

Google Cloud Console:
1. Cria OAuth Client (Web application)
2. Authorized redirect URI:
   ```
   https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
   ```

Supabase Dashboard:
- Authentication → Providers → Google → enable + paste Client ID + Secret

---

## 12. Play Console — sequência de setup

1. **Criar app** — name, package, tipo (Game ou App), Free com IAP
2. **Subir AAB em Internal testing** (não vai pra produção ainda)
3. **Monetize → Products → In-app products** — criar **EXATAMENTE** os productIds do catálogo
4. **Para subscriptions** — criar Subscription separado, com **Base plan** (período, preço, trial)
5. **License testers** — Settings → License testing → adicionar emails de testers

---

## 13. Service Account (Google Cloud)

1. Cloud Console → APIs & Services → Enable: **Google Play Android Developer API**
2. IAM → Service Accounts → Create
3. Generate JSON key → baixa, **trata como senha**
4. Play Console → Settings → API access → link service account
5. Permissões: View financial data, Manage orders and subscriptions

---

## 14. Testes (smoke real)

```sql
-- Audit pós-compra
select * from public.mobile_purchases
where user_id = '<test_user_id>'
order by created_at desc limit 10;

select user_id, tier, status, current_period_end from public.subscriptions
where user_id = '<test_user_id>';
```

---

## 15. Patterns defensivos — lições do GOL 1.006

| Pattern | Por quê |
|---|---|
| Cache access token Google por 1h | Evita 200-400ms de latência por compra + reduz risco de quota |
| `subscriptionsv2` endpoint pra subscription (não `products`) | Subscription tem `subscriptionState`, não `purchaseState` |
| Validação tripla no RPC (productCode, productId, amount) | Defesa em profundidade — mesmo se Edge Function for comprometida, RPC não credita errado |
| `for update` lock no token check | Previne race condition em retries simultâneos |
| `try/catch` no `:consume`/`:acknowledge` | Falha de consume NÃO pode reverter credit já feito |
| `ALLOWED_ORIGINS` específico (capacitor://, ionic://, localhost) | CORS rigoroso bloqueia chamadas de origens não-app |
| Service Account JSON OR OAuth refresh token (2 paths) | Resiliência |
| `revoke from public/authenticated/anon` no RPC | Apenas service role chama |
| `metadata jsonb` na mobile_purchases | Snapshot do estado Google no momento |
| ProductDetails cache no plugin nativo | Evita re-query do Google |
| `pendingConnectionActions` queue no plugin | Reconexão automática |
| `needsServerReconciliation: true` no return do plugin | Sinaliza ao client que validação server-side é OBRIGATÓRIA |

---

## 16. Auditoria SQL pré-launch

```sql
-- 1. Tabelas existem?
select tablename from pg_tables where schemaname = 'public'
and tablename in ('mobile_purchases', 'subscriptions', 'user_profiles');

-- 2. Constraint UNIQUE no purchase_token?
select indexname from pg_indexes
where schemaname = 'public' and tablename = 'mobile_purchases'
and indexname like '%token%';

-- 3. RPC existe?
select proname, pronargs from pg_proc
where proname = 'grant_mobile_purchase' and pronamespace = 'public'::regnamespace;

-- 4. Permissões corretas?
select grantee, privilege_type
from information_schema.role_routine_grants
where routine_name = 'grant_mobile_purchase';

-- 5. RLS habilitado?
select relname, relrowsecurity from pg_class
where relname in ('mobile_purchases', 'subscriptions') and relnamespace = 'public'::regnamespace;
```

---

## 17. Checklist replicável (preenche pra cada app)

```
[ ] APP_NAME =
[ ] PACKAGE_NAME =
[ ] SUPABASE_PROJECT_REF =
[ ] SUPABASE_URL =
[ ] Capacitor configurado (capacitor.config.ts)
[ ] android/ criado (npx cap add)
[ ] Plugin StoreBilling Java implementado
[ ] MainActivity registra plugin
[ ] nativeBilling.ts criado
[ ] BILLING_CATALOG criado
[ ] BillingCheckoutGate criado
[ ] Tela de compra usa BillingCheckoutGate
[ ] SQL mobile_purchases criado
[ ] RPC grant_mobile_purchase criado
[ ] RPC permissões: revoke public, grant service_role
[ ] Edge Function verify-google-play-purchase criada
[ ] Edge Function deployada
[ ] Secret GOOGLE_PLAY_PACKAGE_NAME setado
[ ] Secret GOOGLE_PLAY_SERVICE_ACCOUNT_JSON setado
[ ] Google OAuth Client criado
[ ] Supabase Google provider habilitado
[ ] Redirect URI configurado
[ ] App criado no Play Console
[ ] AAB assinada gerada
[ ] AAB subida em Internal testing
[ ] Produtos criados no Play Console
[ ] Service account criada e linkada
[ ] License testers adicionados
[ ] Compra real testada e validada
[ ] Audit SQL pós-compra confirma benefit aplicado
[ ] mobile_purchases.purchase_token UNIQUE confirmada
```

---

## 18. Gates de release

| Gate | Critério |
|---|---|
| **Gate 8 (código)** | Capacitor + Plugin Java + Bridge TS + Catálogo + Edge Function + RPC + SQL + secrets |
| **Gate 9 (loja)** | Play Console app criado, AAB em Internal, produtos cadastrados, service account linkada, license testers, Google Auth |
| **Gate 10 (validação real)** | 1 compra real ponta-a-ponta validada, audit SQL confirma, restore via `getActivePurchases` testado |

---

## 19. O que NÃO fazer

- ❌ **Não use abstrações tipo `@capgo/native-purchases`** — perde controle granular de consume/acknowledge
- ❌ **Não dispense Edge Function** — cliente nunca é autoridade
- ❌ **Não escreva tier do client direto no Supabase** — mesmo com RLS, é falsificável
- ❌ **Não chame Google API sem cache de access token** — quota e latência ruins
- ❌ **Não use o mesmo endpoint pra consumable e subscription** — são diferentes
- ❌ **Não throw error no `:consume`/`:acknowledge`** — credit já foi feito, falha aqui é não-fatal
- ❌ **Não cole service account JSON em chat ou bash** — vaza histórico

---

## 20. Histórico de mudanças

- **2026-05-24 v2 (hardened):** baseado em código GOL 1.006 (em produção). Adiciona cache de access token, endpoint subscription separado, validação tripla no RPC, try/catch no consume/acknowledge, ALLOWED_ORIGINS específico, 2 paths de auth.
- **2026-04-XX v1 (Elite 2050):** versão inicial, conceitualmente correta mas faltavam defesas operacionais.
