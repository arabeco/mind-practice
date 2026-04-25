# UTF-8 Blacklist

Lista de substituições ASCII conhecidas que `scripts/check-utf8.ts` rejeita.
Adicionar regras novas editando `RULES` no script.

| ASCII | Correto | Razão |
|---|---|---|
| Arquetipo / Arquetipos | Arquétipo / Arquétipos | acento agudo em é |
| Calibracao | Calibração | til + cedilha |
| Direcao | Direção | til + cedilha |
| Decisao | Decisão | til em ã |
| Reflexao | Reflexão | til em ã |
| Atencao | Atenção | til + cedilha |
| Intencao | Intenção | til + cedilha |
| Estavel / Instavel | Estável / Instável | acento agudo |
| Voce / voce | Você / você | cedilha + acento |
| Nao / nao | Não / não | til em ã |
| ja | já | acento agudo |
| ate | até | acento agudo |
| Mascara | Máscara | acento agudo |

Note: `so` é controverso (palavra solo "so" em inglês não existe em PT, mas
"só" sim). Usar word boundary e revisar caso a caso ao adicionar.

## Como rodar

```bash
npm run check:utf8
```

Falha com exit 1 se encontrar violações. Lista cada arquivo:linha + sugestão.
