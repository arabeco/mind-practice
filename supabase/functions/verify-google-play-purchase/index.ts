// ============================================================
// MindPractice — verify-google-play-purchase Edge Function
// ============================================================
//
// Recebe purchaseToken do cliente, valida com Google Play Developer
// API, chama RPC grant_mobile_purchase com service_role pra creditar
// fichas ou tier.
//
// Padrões defensivos (espelhados do GOL 1.006):
//   - Auth obrigatório (Bearer token Supabase)
//   - Catálogo hardcoded server-side (cliente NUNCA é autoridade)
//   - Cross-check productCode <-> productId <-> packageName
//   - Cache de access token Google (1h)
//   - Endpoints separados: products (consumable) vs subscriptionsv2 (sub)
//   - try/catch em :consume/:acknowledge — falha lá NÃO derruba credit
//   - ALLOWED_ORIGINS específico
//
// Deploy:
//   npx supabase functions deploy verify-google-play-purchase --project-ref SEU_REF
//
// Secrets necessários:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)
//   GOOGLE_PLAY_PACKAGE_NAME
//   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (preferido) OU
//   GOOGLE_PLAY_OAUTH_CLIENT_ID + _SECRET + _REFRESH_TOKEN (fallback)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.9.6";

// ============================================================
// Env vars
// ============================================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_PLAY_PACKAGE_NAME = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") || "com.mindpractice.app";
const GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") || "";
const GOOGLE_PLAY_OAUTH_CLIENT_ID = Deno.env.get("GOOGLE_PLAY_OAUTH_CLIENT_ID") || "";
const GOOGLE_PLAY_OAUTH_CLIENT_SECRET = Deno.env.get("GOOGLE_PLAY_OAUTH_CLIENT_SECRET") || "";
const GOOGLE_PLAY_REFRESH_TOKEN = Deno.env.get("GOOGLE_PLAY_REFRESH_TOKEN") || "";

const ANDROIDPUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

// ============================================================
// Catálogo espelhado server-side (defesa em profundidade)
// MUDE AQUI quando atualizar billingCatalog.ts no cliente
// ============================================================
type ProductKind = "consumable" | "subscription";

interface CatalogEntry {
  productId: string;
  kind: ProductKind;
  benefit:
    | { kind: "fichas"; amount: number }
    | { kind: "tier"; tier: "pro" | "founder"; durationDays?: number };
}

const CATALOG: Record<string, CatalogEntry> = {
  fichas_100: {
    productId: "fichas_100",
    kind: "consumable",
    benefit: { kind: "fichas", amount: 100 },
  },
  fichas_300: {
    productId: "fichas_300",
    kind: "consumable",
    benefit: { kind: "fichas", amount: 350 },
  },
  fichas_700: {
    productId: "fichas_700",
    kind: "consumable",
    benefit: { kind: "fichas", amount: 800 },
  },
  pro_monthly: {
    productId: "pro_monthly",
    kind: "subscription",
    benefit: { kind: "tier", tier: "pro", durationDays: 30 },
  },
};

// ============================================================
// CORS
// ============================================================
const DEFAULT_ALLOWED_ORIGINS = [
  SUPABASE_URL,
  "https://mindpractice.app",
  "https://www.mindpractice.app",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
];

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ALLOWED_ORIGINS.join(","))
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

const makeCorsHeaders = (origin: string): HeadersInit => {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

// ============================================================
// Clients
// ============================================================
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

let cachedGoogleAccessToken: { token: string; expiresAt: number } | null = null;

// ============================================================
// Helpers
// ============================================================
const asTrimmedString = (val: unknown): string =>
  typeof val === "string" ? val.trim() : "";

const jsonResponse = (body: unknown, status: number, headers: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

const parseJsonResponse = async (response: Response): Promise<Record<string, unknown>> => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

// ============================================================
// Auth: pega user_id do Bearer token
// ============================================================
const getAuthenticatedUserId = async (req: Request): Promise<string> => {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("AUTH_REQUIRED");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.id) throw new Error("AUTH_INVALID");
  return data.user.id;
};

// ============================================================
// Google Play API: obter access token (com cache 1h)
// ============================================================
const resolveServiceAccount = (): { clientEmail: string; privateKey: string } | null => {
  if (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON.trim()) {
    try {
      const parsed = JSON.parse(GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) as Record<string, unknown>;
      const clientEmail = asTrimmedString(parsed.client_email);
      const privateKey = asTrimmedString(parsed.private_key).replace(/\\n/g, "\n");
      if (clientEmail && privateKey) return { clientEmail, privateKey };
    } catch (err) {
      console.error("[verify-google-play-purchase] Invalid SERVICE_ACCOUNT_JSON:", err);
    }
  }
  return null;
};

const getGooglePlayAccessToken = async (): Promise<string> => {
  const nowSeconds = Math.floor(Date.now() / 1000);

  // Cache hit
  if (cachedGoogleAccessToken && cachedGoogleAccessToken.expiresAt > nowSeconds + 60) {
    return cachedGoogleAccessToken.token;
  }

  const serviceAccount = resolveServiceAccount();
  let tokenResponse: Response;

  // Path A: service account JSON (preferido)
  if (serviceAccount) {
    const privateKey = await importPKCS8(serviceAccount.privateKey, "RS256");
    const assertion = await new SignJWT({ scope: ANDROIDPUBLISHER_SCOPE })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(serviceAccount.clientEmail)
      .setSubject(serviceAccount.clientEmail)
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
  }
  // Path B: OAuth refresh token (fallback)
  else if (GOOGLE_PLAY_OAUTH_CLIENT_ID && GOOGLE_PLAY_OAUTH_CLIENT_SECRET && GOOGLE_PLAY_REFRESH_TOKEN) {
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

  const payload = await parseJsonResponse(tokenResponse);
  if (!tokenResponse.ok) {
    throw new Error(
      `GOOGLE_PLAY_AUTH_FAILED:${tokenResponse.status}:${String(payload.error_description || payload.error || "unknown")}`,
    );
  }

  const accessToken = asTrimmedString(payload.access_token);
  const expiresIn = Number(payload.expires_in || 3600);
  if (!accessToken) throw new Error("GOOGLE_PLAY_EMPTY_ACCESS_TOKEN");

  cachedGoogleAccessToken = {
    token: accessToken,
    expiresAt: nowSeconds + Math.max(60, expiresIn),
  };
  return accessToken;
};

// ============================================================
// Google API URLs
// ============================================================
const productUrl = (packageName: string, productId: string, token: string, suffix = ""): string =>
  `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}${suffix}`;

const subscriptionV2Url = (packageName: string, token: string): string =>
  `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`;

const googleApiFetch = async (url: string, accessToken: string, init: RequestInit = {}): Promise<Record<string, unknown>> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(
      `GOOGLE_PLAY_API_FAILED:${response.status}:${String(payload.error || payload.message || "unknown")}`,
    );
  }
  return payload;
};

// ============================================================
// Body type
// ============================================================
interface RequestBody {
  productCode?: string;
  productId?: string;
  purchaseToken?: string;
  orderId?: string;
  packageName?: string;
  platform?: string;
}

// ============================================================
// Handler: consumable (fichas packs)
// ============================================================
const handleConsumable = async (
  body: RequestBody,
  userId: string,
  accessToken: string,
  catalog: CatalogEntry,
): Promise<Record<string, unknown>> => {
  const purchaseToken = asTrimmedString(body.purchaseToken);
  if (!purchaseToken) throw new Error("PURCHASE_TOKEN_REQUIRED");

  // 1. Valida com Google
  const productPurchase = await googleApiFetch(
    productUrl(GOOGLE_PLAY_PACKAGE_NAME, catalog.productId, purchaseToken),
    accessToken,
  );

  if (Number(productPurchase.purchaseState) !== 0) {
    throw new Error(`PURCHASE_NOT_COMPLETED:${String(productPurchase.purchaseState ?? "unknown")}`);
  }

  // Cross-check: Google retornou o productId esperado?
  const googleProductId = asTrimmedString(productPurchase.productId);
  if (googleProductId && googleProductId !== catalog.productId) {
    throw new Error("GOOGLE_PRODUCT_MISMATCH");
  }

  // 2. RPC pra creditar fichas
  if (catalog.benefit.kind !== "fichas") {
    throw new Error("CATALOG_MISMATCH:expected_fichas");
  }

  const { data, error } = await supabaseAdmin.rpc("grant_mobile_purchase", {
    p_user_id: userId,
    p_product_code: body.productCode,
    p_product_id: catalog.productId,
    p_purchase_token: purchaseToken,
    p_order_id: body.orderId ?? null,
    p_package_name: body.packageName ?? GOOGLE_PLAY_PACKAGE_NAME,
    p_platform: "android",
    p_benefit_kind: "fichas",
    p_benefit_amount: catalog.benefit.amount,
    p_benefit_tier: null,
    p_benefit_duration_days: null,
    p_metadata: {
      google_state: productPurchase,
    },
  });

  if (error) throw new Error(`GRANT_FAILED:${error.message}`);

  // 3. :consume — try/catch (falha aqui NÃO derruba credit)
  let consumeStatus: "consumed" | "already_consumed" | "failed" | "skipped" = "skipped";
  if (Number(productPurchase.consumptionState) === 1) {
    consumeStatus = "already_consumed";
  } else {
    try {
      await googleApiFetch(
        productUrl(GOOGLE_PLAY_PACKAGE_NAME, catalog.productId, purchaseToken, ":consume"),
        accessToken,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      consumeStatus = "consumed";
    } catch (err) {
      console.error("[verify-google-play-purchase] consume failed after credit:", err);
      consumeStatus = "failed";
    }
  }

  return {
    success: true,
    benefit_kind: "fichas",
    consume_status: consumeStatus,
    ...data,
  };
};

// ============================================================
// Handler: subscription (pro_monthly)
// ============================================================
const handleSubscription = async (
  body: RequestBody,
  userId: string,
  accessToken: string,
  catalog: CatalogEntry,
): Promise<Record<string, unknown>> => {
  const purchaseToken = asTrimmedString(body.purchaseToken);
  if (!purchaseToken) throw new Error("PURCHASE_TOKEN_REQUIRED");

  // 1. Valida com Google (endpoint subscriptionsv2)
  const sub = await googleApiFetch(
    subscriptionV2Url(GOOGLE_PLAY_PACKAGE_NAME, purchaseToken),
    accessToken,
  );

  const subState = asTrimmedString(sub.subscriptionState);
  if (subState !== "SUBSCRIPTION_STATE_ACTIVE" && subState !== "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") {
    throw new Error(`SUBSCRIPTION_NOT_ACTIVE:${subState || "unknown"}`);
  }

  // Cross-check: line item contém o productId esperado?
  const lineItems = (sub.lineItems as Array<{ productId?: string }> | undefined) ?? [];
  const hasProduct = lineItems.some(li => li.productId === catalog.productId);
  if (!hasProduct) throw new Error("SUBSCRIPTION_PRODUCT_MISMATCH");

  // 2. RPC pra setar tier
  if (catalog.benefit.kind !== "tier") {
    throw new Error("CATALOG_MISMATCH:expected_tier");
  }

  const { data, error } = await supabaseAdmin.rpc("grant_mobile_purchase", {
    p_user_id: userId,
    p_product_code: body.productCode,
    p_product_id: catalog.productId,
    p_purchase_token: purchaseToken,
    p_order_id: asTrimmedString(sub.latestOrderId),
    p_package_name: body.packageName ?? GOOGLE_PLAY_PACKAGE_NAME,
    p_platform: "android",
    p_benefit_kind: "tier",
    p_benefit_amount: null,
    p_benefit_tier: catalog.benefit.tier,
    p_benefit_duration_days: catalog.benefit.durationDays ?? null,
    p_metadata: {
      google_state: sub,
    },
  });

  if (error) throw new Error(`GRANT_FAILED:${error.message}`);

  // 3. :acknowledge subscription — try/catch
  let ackStatus: "acknowledged" | "already_acknowledged" | "failed" | "skipped" = "skipped";
  const currentAck = asTrimmedString(sub.acknowledgementState);
  if (currentAck === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") {
    ackStatus = "already_acknowledged";
  } else {
    try {
      await googleApiFetch(
        `${subscriptionV2Url(GOOGLE_PLAY_PACKAGE_NAME, purchaseToken)}:acknowledge`,
        accessToken,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      ackStatus = "acknowledged";
    } catch (err) {
      console.error("[verify-google-play-purchase] subscription acknowledge failed after credit:", err);
      ackStatus = "failed";
    }
  }

  return {
    success: true,
    benefit_kind: "tier",
    ack_status: ackStatus,
    ...data,
  };
};

// ============================================================
// Main handler
// ============================================================
serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = makeCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "METHOD_NOT_ALLOWED" }, 405, corsHeaders);
  }

  try {
    // 1. Auth
    const userId = await getAuthenticatedUserId(req);

    // 2. Parse body
    const body = (await req.json().catch(() => ({}))) as RequestBody;

    const productCode = asTrimmedString(body.productCode);
    const productId = asTrimmedString(body.productId);
    const packageName = asTrimmedString(body.packageName) || GOOGLE_PLAY_PACKAGE_NAME;

    if (!productCode) throw new Error("PRODUCT_CODE_REQUIRED");

    // 3. Cross-check com catálogo server-side
    const catalog = CATALOG[productCode];
    if (!catalog) throw new Error(`UNKNOWN_PRODUCT_CODE:${productCode}`);

    if (productId && productId !== catalog.productId) {
      throw new Error("PRODUCT_ID_MISMATCH");
    }

    if (packageName !== GOOGLE_PLAY_PACKAGE_NAME) {
      throw new Error("PACKAGE_MISMATCH");
    }

    // 4. Pega access token (com cache)
    const accessToken = await getGooglePlayAccessToken();

    // 5. Dispatch por kind
    let result: Record<string, unknown>;
    if (catalog.kind === "subscription") {
      result = await handleSubscription(body, userId, accessToken, catalog);
    } else {
      result = await handleConsumable(body, userId, accessToken, catalog);
    }

    return jsonResponse(result, 200, corsHeaders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[verify-google-play-purchase]", msg);
    return jsonResponse({ success: false, error: msg }, 400, corsHeaders);
  }
});
