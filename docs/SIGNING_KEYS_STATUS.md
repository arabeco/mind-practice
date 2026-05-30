# Signing Keys Status

> Registro das chaves de assinatura Android dos apps.
> **NÃO contém senhas** (essas ficam só em `android/key.properties`, fora do git, + backup no gerenciador de senhas).
> Fingerprints podem ser públicas — servem pra registrar no Play Console / Firebase / Google Cloud.

---

## MindPractice

| Campo | Valor |
|---|---|
| applicationId / package | `com.mindpractice.app` |
| Keystore (arquivo) | `android/mindpractice-release.jks` *(fora do git)* |
| Alias | `mindpractice_release` |
| Algoritmo | RSA 2048, validade 10.000 dias |
| Criada em | 2026-05-30 |
| Config | `android/key.properties` (gitignored) + `signingConfig release` no `app/build.gradle` |
| Play App Signing | ⏳ aceitar no 1º upload (Google guarda a chave final; esta vira a *upload key*) |
| 1º AAB enviado? | ❌ ainda não (versionCode 1, nada na Play — confirmado) |

**Fingerprints (upload key):**
```
SHA1:   0D:4F:04:9D:CC:15:EF:BE:FF:AC:73:42:50:D0:62:41:BF:46:B4:9F
SHA256: C4:C6:9F:51:EC:57:14:BF:38:4F:61:09:2D:07:8F:CD:1E:C1:AC:7E:ED:2D:A0:C8:7F:D7:FF:CB:25:29:E4:3E
```

### ⚠️ Backup obrigatório (fora do repo)
- [ ] `android/mindpractice-release.jks` copiada pra local seguro (Drive/pendrive/gerenciador)
- [ ] Senha `***REDACTED***` (store + key) anotada no gerenciador de senhas
- [ ] Alias `mindpractice_release` anotado

> Se perder a `.jks` ANTES de aceitar Play App Signing, ou perder a chave de upload depois,
> dá pra resetar via Play Console (vantagem do Play App Signing). Mesmo assim: **faça backup.**

---

## Outros apps (preencher quando gerar)

| App | package | keystore | alias | criada | SHA1 |
|---|---|---|---|---|---|
| Glyph | | | | | |
| ELITE2050 | | | | | |
| Cloak | | | | | |
