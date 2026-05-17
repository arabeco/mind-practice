# Mobile setup — Capacitor 7 + IAP nativo (Android + iOS)

Tudo do código mobile já está pronto e idle no repo. Você precisa fazer
**3 setups manuais** quando quiser ativar:

1. Instalar tools nativas (Android Studio + Xcode)
2. Adicionar plataformas Capacitor (`npx cap add android` + `npx cap add ios`)
3. Criar contas Apple Developer + Google Play Console + cadastrar 2 produtos

Pagamento usa **In-App Purchase nativo** via `@capgo/native-purchases` — sem
intermediários (RevenueCat, Stripe). User toca botão → Apple/Google abre UI
nativa de pagamento → app escreve tier no Supabase.

---

## 1. Instalar tools nativas

**Android (qualquer OS):**
- [Android Studio](https://developer.android.com/studio) (latest)

**iOS (apenas macOS):**
- [Xcode](https://apps.apple.com/us/app/xcode/id497799835) (latest, App Store)
- `xcode-select --install` (Command Line Tools)
- CocoaPods: `sudo gem install cocoapods`

## 2. Adicionar plataformas Capacitor

Rodar **uma vez** quando estiver pronto:

```bash
npm run build:mobile      # gera ./out/ (static export)
npx cap add android       # cria ./android (commitar OU manter em .gitignore — sua escolha)
npx cap add ios           # macOS apenas — cria ./ios
npx cap sync              # copia out/ + plugins
```

## 3. Criar contas + cadastrar produtos

### 3.1. Google Play Console (US$ 25 one-time)
- https://play.google.com/console
- Criar app "MindPractice", package = `com.mindpractice.app`
- **Monetize → Products:**
  - **Subscription** com productId = `pro_monthly`
    - Preço base R$ 14,90/mês
    - Free trial: 7 dias
  - **Managed product (one-time)** com productId = `founder_lifetime`
    - Preço R$ 89,00
- **Internal testing track** pra distribuir build sem review

### 3.2. Apple Developer Program (US$ 99/ano)
- https://developer.apple.com/programs/
- App Store Connect → criar app "MindPractice", bundle = `com.mindpractice.app`
- **In-App Purchases → Manage:**
  - **Auto-Renewable Subscription** com productId = `pro_monthly`
    - Preço R$ 14,90/mês
    - Introductory offer: 7-day free trial
  - **Non-Consumable** com productId = `founder_lifetime`
    - Preço R$ 89,00
- **TestFlight** pra distribuir build (review interna ~minutos, externa 1-2 dias)

**IMPORTANTE:** os productIds devem ser EXATAMENTE `pro_monthly` e
`founder_lifetime` (case-sensitive). Eles estão hardcoded em
`src/lib/iap.ts`. Quer mudar? Edita lá e nos products das lojas.

### 3.3. Supabase OAuth providers
- Dashboard → Authentication → Providers
- **Google**: ativar, cole Client ID + Secret (do Google Cloud Console)
- **Apple**: ativar, cole Service ID + Team ID + Key ID + .p8 file
  (do Apple Developer Console → Certificates, Identifiers & Profiles)

## 4. SQL adicional pra IAP

Roda essa migration no Supabase Studio (idempotente):

```bash
supabase/migrations/2026-05-17-iap-client-write.sql
```

Adiciona RLS `subs_insert_own` + `subs_update_own` pra cliente conseguir
escrever a própria row em `subscriptions` após purchase nativo.

## 5. Env vars (`.env.local`)

```bash
# Supabase (já existe)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Admin dashboard (opcional)
ADMIN_USER_ID=<seu-uuid-do-supabase-auth>

# Webhook ops (opcional, só pra rotas /api/admin/* e /api/referrals/attribute)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Não precisa de env pra IAP** — `@capgo/native-purchases` lê productIds
do código + da loja diretamente, sem API keys externas.

## 6. Build flow

```bash
# Web (igual antes — sem features de IAP, só vitrine + waitlist)
npm run dev       # localhost:3000
npm run build     # build SSR completo

# Mobile
npm run build:mobile      # gera ./out/ (static export)
npm run cap:sync          # copia out/ + plugins pro android/ios
npm run cap:android       # abre Android Studio
npm run cap:ios           # abre Xcode (macOS apenas)
```

No Android Studio: Run → escolhe device/emulador → app builda e roda.
No Xcode: Product → Run → escolhe simulator/device.

**Upload pra loja:**
- Android: Generate Signed Bundle/APK → upload .aab no Play Console
- iOS: Archive → Distribute App → App Store Connect → submit pra TestFlight

## 7. O que já está implementado e idle

| Componente | Onde | Estado |
|---|---|---|
| Login Google + Apple | `src/app/login/page.tsx` | Botões prontos. OAuth via Supabase ativa quando providers forem configurados no Supabase Dashboard. |
| Capacitor config | `capacitor.config.ts` | Pronto. App ID `com.mindpractice.app`, splash + status bar configurados. |
| IAP helper | `src/lib/iap.ts` | Idle em web (`isNativeApp()` retorna false). Em Capacitor nativo, `purchaseProduct()` abre StoreKit/Play Billing. |
| Tier system | `subscriptions` table + `useSubscription` hook | Cliente escreve tier direto após purchase nativo. RLS protege (só own row). |
| `/assinatura` | `src/app/assinatura/page.tsx` | Em web: vitrine + waitlist. Em app: botões "Assinar" funcionais + "Restaurar compras". |

## 8. Próximos passos recomendados

Quando você tiver as contas:

1. **Habilitar OAuth Google + Apple no Supabase** → testa login no web e mobile
2. **Cadastrar `pro_monthly` + `founder_lifetime`** em ambas as lojas com preços iguais
3. **Adicionar plataforma Android primeiro** → roda no emulador, testa purchase
4. **TestFlight + Internal Testing** → distribuir build pra quem quiser testar
5. **iOS depois** (mais burocrático)

## 9. Segurança / fraude

Cliente escreve `subscriptions.tier` direto após purchase nativo. RLS
garante que só pode escrever a própria row, mas user avançado conseguiria
em tese forjar uma escrita pulando o purchase real.

Pra MVP, aceitável (Apple/Google bloqueiam grande parte). Pra v2:
- Adicionar Supabase Edge Function que recebe receipt do purchase
- Valida receipt com Apple `verifyReceipt` ou Google Play Developer API
- Só após validação, escreve tier (via service role, bypassa RLS)
- Cliente perde permissão de write direto

Implementar quando tiver tração real (>50 users pagando).
