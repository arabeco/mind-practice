# Prompt simples - Paywall Android igual ao GOL

Implemente o paywall deste app olhando primeiro o estado atual do GOL/Glyph como referencia.

## 1. Olhar o GOL antes de criar

Antes de mexer, compare com o GOL/Glyph:

- como o paywall chama a compra;
- como o Capacitor Android nativo retorna purchaseToken, productId e packageName;
- como a Supabase Edge Function valida a compra;
- como o beneficio/premium e liberado no banco;
- quais secrets ficam na Supabase, nao na Vercel.

Nao crie arquitetura nova se o GOL ja resolve.

## 2. Fluxo obrigatorio

O fluxo certo e:

```
Android app
  -> Capacitor plugin nativo Google Play Billing
  -> purchaseToken/productId/packageName
  -> Supabase Edge Function
  -> Google Play Developer API
  -> RPC/tabela Supabase
  -> liberar premium/moeda
```

Regras:

- Nao usar API route da Vercel para billing.
- Nao colocar Google Play private key/service account na Vercel.
- Nao liberar premium/moeda direto pelo client.
- A Vercel fica so com env publica do app, se o frontend precisar.
- Secrets de billing ficam na Supabase Edge Function.

## 3. Tags/IDs certos do Play Console

Use exatamente os IDs que existirem no Play Console.

Antes de finalizar, confira:

- packageName do Android igual ao app no Play Console;
- productId igual ao produto/assinatura criado no Play Console;
- basePlanId igual ao base plan da assinatura, se o app usar assinatura;
- tipo certo: subscription para assinatura, consumable para moeda;
- service account autorizada no Play Console para esse app.

IDs de produto e base plan nao sao secrets. Podem ficar no client/config.
Credenciais Google Play sao secrets. Ficam na Supabase.

## 4. O que pode ter sido feito errado

Antes de implementar, procure e corrija estes erros:

- API route da Vercel validando Google Play Billing.
- Secrets de billing na Vercel (GOOGLE_PLAY_*, service account, private key, service role).
- .env.local com secrets de billing que deveriam estar na Supabase.
- Client liberando premium/moeda sem Edge Function.
- Produto/base plan vindo de env errada ou divergente do Play Console.
- packageName hardcoded errado no paywall ou na function.
- Function usando endpoint Google errado para assinatura ou produto.
- acknowledge/consume montado com URL incompleta.
- Arquivos mortos de billing antigo ainda sendo importados.
- Dois lugares diferentes definindo os IDs de produto sem fonte unica.
- Vercel sendo tratada como backend de billing.

## Resultado esperado

No final deve existir:

- paywall chamando compra nativa Android;
- Edge Function Supabase validando Google Play;
- secrets de billing somente na Supabase;
- Vercel sem billing secret;
- produtos/base plans batendo com o Play Console;
- sem route Vercel de billing.
