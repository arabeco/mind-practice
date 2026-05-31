// ============================================================
// MindPractice — delete-account Edge Function
// ============================================================
//
// Apaga totalmente a conta do usuario autenticado:
//   1. Valida Bearer token (JWT do Supabase Auth)
//   2. Chama RPC public.delete_my_account() — apaga todas as linhas
//      nas tabelas public ligadas a esse user (12 tabelas)
//   3. Chama auth.admin.deleteUser(uid) com service role — apaga
//      a linha em auth.users (so service role pode fazer isso)
//   4. Retorna { ok: true }
//
// Compliance: LGPD art. 18 (direito de eliminacao) + Google Play
// Data Safety (delete-my-data in-app flow).
//
// Deploy:
//   npx supabase functions deploy delete-account --project-ref SEU_REF
//
// Secrets usados (ja existem na Supabase):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

// ------------------------------------------------------------
// CORS
// ------------------------------------------------------------
const DEFAULT_ALLOWED_ORIGINS = [
  SUPABASE_URL,
  "https://mind-practice-two.vercel.app",
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

const jsonResponse = (body: unknown, status: number, headers: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

// ------------------------------------------------------------
// Service-role client (pra chamar auth.admin.deleteUser)
// ------------------------------------------------------------
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ------------------------------------------------------------
// Handler
// ------------------------------------------------------------
serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = makeCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405, cors);
  }

  // --- Valida JWT do usuario ---
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return jsonResponse({ error: "NOT_AUTHENTICATED" }, 401, cors);
  }

  // Cliente "as user" pra obter o uid a partir do JWT
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return jsonResponse({ error: "INVALID_TOKEN", detail: userErr?.message }, 401, cors);
  }
  const userId = userData.user.id;
  const userEmail = userData.user.email ?? null;

  // --- 1) Apaga todos os dados public via RPC (security definer + auth.uid) ---
  // Importante: rodamos a RPC com o token do usuario (nao admin) pra que
  // auth.uid() dentro da funcao resolva corretamente pro user que esta
  // pedindo a exclusao. Nao da pra apagar dado de outro usuario por aqui.
  const { error: rpcErr } = await supabaseUser.rpc("delete_my_account");
  if (rpcErr) {
    return jsonResponse(
      { error: "RPC_FAILED", detail: rpcErr.message },
      500,
      cors,
    );
  }

  // --- 2) Apaga a linha em auth.users via service role ---
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authErr) {
    // Dados public ja foram apagados — logamos mas nao revertemos.
    // O proximo retry vai falhar no RPC (sem linhas) e seguir pra ca de novo.
    console.error("[delete-account] auth.admin.deleteUser failed", {
      userId,
      message: authErr.message,
    });
    return jsonResponse(
      { error: "AUTH_DELETE_FAILED", detail: authErr.message },
      500,
      cors,
    );
  }

  // --- 3) Log de auditoria (best-effort) ---
  try {
    await supabaseAdmin.from("account_deletion_web_requests").insert({
      app_slug: "mindpractice",
      email: userEmail ?? "anonymous-in-app",
      reason: "in_app_self_service",
      status: "completed",
      processed_at: new Date().toISOString(),
      notes: `uid=${userId}`,
    });
  } catch (_err) {
    // ignore — auditoria nao deve quebrar a exclusao
  }

  return jsonResponse({ ok: true, userId }, 200, cors);
});
