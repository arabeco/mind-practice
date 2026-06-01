# Roteiro de Verificação por App (5 frentes)

> Roda em cada app antes de lançar. Apps são de 2 tipos — várias checagens mudam.
> NÃO aplicar fixes de um tipo cegamente no outro.

## ⚠️ Primeiro: que tipo é o app?

| | Vite (glyph/GOL, elite-50) | Next.js (King's World) | **MindPractice (híbrido)** |
|---|---|---|---|
| Tem servidor? | ❌ só navegador | ✅ tem | ⚠️ **NÃO** (`output: 'export'` → site estático p/ Capacitor) |
| Chave das tabelas | só anon | anon + secret (servidor) | **só anon** no client (secret só em Edge Functions) |
| Login OAuth | troca code no cliente, sem `/auth/callback` | precisa rota `/auth/callback` | **como Vite** — `redirectTo: window.location.origin`, sem `/auth/callback` |
| RLS | precisa policies (não pode só "ligar") | pode ligar sem policy | **precisa policies** (lê por anon) |

> 🔑 **MindPractice é Next.js no nome, Vite no comportamento de auth.** Porque é exportado
> estático pro app Android. Não tem `/auth/callback`, troca o code no client, e DEPENDE
> de RLS+policy igual os Vite. Tratar como Vite nas checagens de auth e RLS.

---

## 1️⃣ Deploy / Env (o site abre?)
- [x] URL Vercel carrega sem 500/tela branca — https://mind-practice-two.vercel.app
- [x] Env vars do Supabase = projeto certo (ref `clkorbtmxzodttxnwldi`), sem chave errada
- [x] Sem secret de billing na Vercel (só `NEXT_PUBLIC_*`)

## 2️⃣ Login (faz e continua logado?)
Cadeia OAuth do MindPractice (igual Vite):
```
clica "Entrar com Google"
  → signInWithOAuth({ redirectTo: window.location.origin })   [AuthContext.tsx:66]
  → Google autentica
  → Google → Supabase: https://clkorbtmxzodttxnwldi.supabase.co/auth/v1/callback   [Google Cloud]
  → Supabase → de volta pro redirectTo (raiz do site)   [Supabase Redirect URLs]
```
- [x] Supabase Auth → **Site URL** = `https://mind-practice-two.vercel.app` (com https!)
- [x] Supabase Auth → **Redirect URLs** = domínio atual com `/**` + localhost
- [x] Google Cloud → OAuth → Authorized redirect URIs = `https://clkorbtmxzodttxnwldi.supabase.co/auth/v1/callback`
- [N/A] rota `/auth/callback` no app — **não precisa** (não é Next.js com servidor)
- [ ] ⚠️ **TESTAR LOGIN DENTRO DO APK** — `window.location.origin` no app é `capacitor://localhost`/`http://localhost`. Esse origin precisa estar nas Redirect URLs do Supabase senão login funciona no navegador mas FALHA no app empacotado.

> 🐛 O bug clássico (que quebrou outro app): faltava `https://` no Site URL, ou domínio
> errado nas Redirect URLs → loop de login. Aqui está correto.

## 3️⃣ Billing
- [x] Edge Function `verify-google-play-purchase` ACTIVE (v2)
- [x] Secrets `GOOGLE_PLAY_PACKAGE_NAME` + `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (mesma JSON da glyph nos 5 apps)
- [x] IDs de produto no `billingCatalog.ts` = fichas_100/300/700 + pro_monthly
- [ ] ⚠️ Confirmar IDs batem com Play Console (quando criar os produtos lá)
- [ ] ⚠️ Vincular Service Account no Play Console (senão 401 do Google)

## 4️⃣ RLS / Segurança ⭐ (teste objetivo — roda em qualquer app)
SQL Editor de cada app:
```sql
select c.relname, c.relrowsecurity as rls_on
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by rls_on;
```
Tabelas sensíveis devem ter `rls_on = true`.
⚠️ MindPractice lê por anon → toda tabela com RLS PRECISA de policy senão o app quebra.

Status no repo (schema.sql + migrations) — todas com RLS **e** policy:
- [x] profiles, game_state, friendships, feed_events
- [x] push_registrations, campaign_notifications
- [x] referrals, season_scores
- [x] subscriptions (só `subs_read_own` — write via service_role), purchases
- [x] waitlist (insert anon), ficha_spend_log, mobile_purchases
- [x] ✅ **Confirmado no banco REAL (2026-06-01):** 14 tabelas, todas com `rls_on=true` E ≥1 policy. Zero tabela com RLS-sem-policy. (inclui `account_deletion_web_requests`)

## 5️⃣ Conformidade / Build
- [x] Privacidade — https://arabeco.github.io/privacidade-mind-practice.html
- [x] Termos — https://arabeco.github.io/termos-mind-practice.html
- [x] Exclusão de conta — https://arabeco.github.io/mind-practice/exclusao.html (+ botão no app, perfil)
- [ ] Páginas linkadas DENTRO do app (rodapé login / perfil) — pendente
- [x] Keystore gerado (`mindpractice-release.jks`) + AAB assinado
- [ ] Backup keystore fora do PC
