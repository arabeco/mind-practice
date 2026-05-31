# Android Signing Keys - Mind Practice

## Mind Practice

Package:

```text
com.mindpractice.app
```

Arquivos locais de assinatura release:

```text
C:\Users\Afonso\Desktop\mindpractice\android\mindpractice-release.jks
C:\Users\Afonso\Desktop\mindpractice\android\key.properties
```

Alias:

```text
mindpractice_release
```

Senha definida antes do primeiro upload na Play:

```text
***REDACTED***
```

Certificado/fingerprint publico:

```text
SHA1   = 0D:4F:04:9D:CC:15:EF:BE:FF:AC:73:42:50:D0:62:41:BF:46:B4:9F
SHA256 = C4:C6:9F:51:EC:57:14:BF:38:4F:61:09:2D:07:8F:CD:1E:C1:AC:7E:ED:2D:A0:C8:7F:D7:FF:CB:25:29:E4:3E
```

AAB release gerado:

```text
C:\Users\Afonso\Desktop\mindpractice\android\app\build\outputs\bundle\release\app-release.aab
```

SHA256 do arquivo AAB:

```text
CCC38CDE7C385183D6E10844B2AF1F431373F0020B0E637A555B9F367B2FD2A7
```

Backup obrigatorio:

- guardar `mindpractice-release.jks`
- guardar `key.properties`
- nao mandar esses arquivos para GitHub

Status:

- `key.properties` esta ignorado no git.
- `mindpractice-release.jks` esta ignorado no git.
- `bundleRelease` gerou AAB assinado.
