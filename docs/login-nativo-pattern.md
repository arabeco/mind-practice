# Login Nativo (Google/Apple) — Padrão GOL pra replicar nos apps

> Resolve o bug do "login falso-positivo": OAuth do Google funciona no navegador
> mas QUEBRA no APK (o Google recusa OAuth dentro de WebView). Espelhado do
> GOL 1.006 (em produção). Aplicado no MindPractice em 2026-06-01.

## O problema
`signInWithOAuth({ redirectTo: window.location.origin })` funciona no web, mas no
app empacotado `window.location.origin` vira `https://localhost` (WebView) e o
Google bloqueia OAuth em WebView. Resultado: usuário toca "Entrar com Google" e
não acontece nada / erro "browser não seguro".

## A solução — 5 peças (todas necessárias juntas)

### 1. `src/lib/nativeAuth.ts`
Define o deep link e helpers. **Trocar o scheme pelo appId do app:**
```ts
const NATIVE_AUTH_SCHEME = 'com.mindpractice.app';   // = appId do capacitor.config.ts
export const NATIVE_AUTH_REDIRECT_URL = `${NATIVE_AUTH_SCHEME}://auth/callback`;
// + isCapacitorNativeRuntime(), getOAuthRedirectUrl(), isNativeAuthCallbackUrl(), parseNativeAuthCallback()
```

### 2. Login (AuthContext): abre navegador REAL no app
```ts
const { data } = await sb.auth.signInWithOAuth({
  provider,
  options: {
    redirectTo: getOAuthRedirectUrl(window.location.origin), // app→deep link, web→site
    skipBrowserRedirect: isCapacitorNativeRuntime(),          // app: não usa WebView
  },
});
if (isCapacitorNativeRuntime() && data?.url) {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url: data.url });   // Chrome Custom Tab = navegador real
}
```

### 3. Listener de retorno (AuthContext, useEffect)
```ts
const { App } = await import('@capacitor/app');
App.addListener('appUrlOpen', async ({ url }) => {
  if (!isNativeAuthCallbackUrl(url)) return;
  const { code } = parseNativeAuthCallback(url);
  await Browser.close();
  if (code) await sb.auth.exchangeCodeForSession(code);  // → sessão = logado
});
```

### 4. AndroidManifest.xml — registrar o deep link
Dentro da `<activity .MainActivity>`, após o intent-filter LAUNCHER:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:host="auth" android:pathPrefix="/callback"
        android:scheme="@string/custom_url_scheme" />
</intent-filter>
```
> `@string/custom_url_scheme` o Capacitor já gera = o appId. Conferir em
> `android/app/src/main/res/values/strings.xml`.

### 5. Supabase → Auth → URL Configuration → Redirect URLs
**Adicionar** (não remove as existentes):
```
com.mindpractice.app://auth/callback
```

## Dependências
```
@capacitor/browser   (mesma major do @capacitor/core — aqui v7)
@capacitor/app       (já vinha)
```

## O que NÃO mexer
- **Google Cloud**: nada. O campo "Authorized redirect URIs" só aceita https://,
  e o Google só conhece o callback do Supabase (`https://<ref>.supabase.co/auth/v1/callback`),
  que já está lá (senão nem o web logava). O deep link é repassado pelo Supabase, não pelo Google.

## Replicar em outro app (checklist)
- [ ] `npm i @capacitor/browser@<major-do-core>`
- [ ] copiar `nativeAuth.ts`, trocar `NATIVE_AUTH_SCHEME` pelo appId
- [ ] aplicar peças 2 e 3 no contexto de auth
- [ ] intent-filter no AndroidManifest
- [ ] adicionar `<appId>://auth/callback` no Supabase Redirect URLs
- [ ] `npm run cap:sync` → rebuild AAB → testar login Google NO APARELHO

## Schemes por app
| App | scheme (appId) | deep link |
|---|---|---|
| GOL/Glyph | life.glyph.app | life.glyph.app://auth/callback ✅ (modelo) |
| MindPractice | com.mindpractice.app | com.mindpractice.app://auth/callback ✅ |
| Elite 2050 | com.becoslab.elite2050 | com.becoslab.elite2050://auth/callback (pendente) |
