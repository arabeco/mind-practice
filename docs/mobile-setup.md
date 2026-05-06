# Mobile setup — Capacitor 7 + RevenueCat (Android + iOS)

Tudo do código mobile já está pronto e idle no repo. Você precisa fazer
**3 setups manuais** quando quiser ativar:

1. Instalar tools nativas (Android Studio + Xcode)
2. Adicionar plataformas Capacitor (`npx cap add android` + `npx cap add ios`)
3. Criar contas Apple Developer + Google Play Console + RevenueCat
4. Setar env vars

Depois disso, `npm run cap:android` e `npm run cap:ios` abrem os projetos
nativos em IDE prontos pra build/upload.

---

## 1. Instalar tools nativas

**Android (qualquer OS):**
- [Android Studio](https://developer.android.com/studio) (latest)
- Durante instalação, aceitar SDK + emulador

**iOS (apenas macOS):**
- [Xcode](https://apps.apple.com/us/app/xcode/id497799835) (latest, App Store)
- `xcode-select --install` (Command Line Tools)
- CocoaPods: `sudo gem install cocoapods`

## 2. Adicionar plataformas Capacitor

Rodar **uma vez** quando estiver pronto:

```bash
# Build estático primeiro (gera ./out/)
npm run build:mobile

# Adicionar plataformas (cria ./android e ./ios)
npx cap add android
npx cap add ios   # macOS apenas

# Sincronizar
npx cap sync
```

Os diretórios `android/` e `ios/` são gerados — adicione ao git ou ao
.gitignore conforme política de versionamento (Capacitor recomenda
commitar pra ter projetos reproducíveis).

## 3. Criar contas e produtos

### 3.1. Google Play Console (US$ 25 one-time)
- https://play.google.com/console
- Criar app "MindPractice", package name = `com.mindpractice.app`
- **Internal testing track** (ativa rapidíssimo, não passa por review pra ≤100 testers)

### 3.2. Apple Developer Program (US$ 99/ano)
- https://developer.apple.com/programs/
- Criar app no App Store Connect, bundle id = `com.mindpractice.app`
- **TestFlight** (interna sem review pra equipe; review rápido pra externa ≤10k testers)

### 3.3. RevenueCat (free até US$ 10k MRR)
- https://www.revenuecat.com/
- Criar projeto, conectar App Store Connect + Google Play Console
- Criar produtos:
  - `mindpractice_pro_monthly` (subscription R$ 14,90/mês com 7d trial)
  - `mindpractice_founder` (one-time R$ 89, lifetime entitlement)
- Criar entitlements:
  - `pro` → inclui `mindpractice_pro_monthly`
  - `founder` → inclui `mindpractice_founder`
- Configurar webhook RevenueCat → Supabase Edge Function
  (atualiza `subscriptions.tier` baseado em entitlement ativo)
- Copiar **public API keys** (uma iOS, uma Android)

### 3.4. Supabase OAuth providers
- Dashboard → Authentication → Providers
- **Google**: ativar, cole Client ID + Secret (do Google Cloud Console)
- **Apple**: ativar, cole Service ID + Team ID + Key ID + .p8 file
  (do Apple Developer Console → Certificates, Identifiers & Profiles)
- Configurar redirect URL Supabase no Google e Apple

## 4. Env vars (`.env.local`)

```bash
# Supabase (já existe)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# RevenueCat (mobile IAP) — DEIXAR EM BRANCO até criar conta
NEXT_PUBLIC_REVENUECAT_IOS_KEY=
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=
```

Sem essas keys preenchidas, `isRevenueCatActive()` retorna false e o
app gracefully degrada — botões de assinatura ficam disabled.

## 5. Build flow

```bash
# Web (igual antes)
npm run dev      # localhost:3000
npm run build    # build SSR completo

# Mobile
npm run build:mobile         # gera ./out/ (static export)
npm run cap:sync             # copia out/ + plugins pro android/ios
npm run cap:android          # abre Android Studio
npm run cap:ios              # abre Xcode (macOS apenas)
```

No Android Studio: Run → escolhe device/emulador → app builda e roda.
No Xcode: Product → Run → escolhe simulator/device.

Pra **upload pra loja**:
- Android: Generate Signed Bundle/APK → upload .aab no Play Console
- iOS: Archive → Distribute App → App Store Connect → submit pra TestFlight

## 6. O que já está implementado e idle

| Componente | Onde | Estado |
|---|---|---|
| Login Google + Apple | `src/app/login/page.tsx` | Botões prontos. OAuth via Supabase ativa quando providers forem configurados no Supabase Dashboard. |
| Capacitor config | `capacitor.config.ts` | Pronto. App ID `com.mindpractice.app`, splash screen + status bar configurados. |
| RevenueCat helper | `src/lib/revenuecat.ts` | Idle até env keys serem setadas. `isRevenueCatActive()` controla degradação graciosa. |
| Tier system | `subscriptions` table + `useSubscription` hook | Tier source: webhook do RevenueCat (mobile) escreve no Supabase. Web mostra status read-only. |

## 7. Próximos passos recomendados

Quando você tiver as contas:

1. **Habilitar OAuth Google + Apple no Supabase** → testa login no web e mobile
2. **Adicionar plataforma Android primeiro** (review é mais rápido) → roda no emulador
3. **Configurar RevenueCat** → produtos + entitlements + webhook pra Supabase
4. **TestFlight + Internal Testing** → distribuir build pra quem quiser testar
5. **iOS depois** (mais burocrático)
