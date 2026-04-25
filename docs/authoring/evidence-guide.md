# Guia de Evidência (Autoria de Decks)

Cada `Option.evidence` declara o que **escolher essa opção** revela sobre o jogador. É o único formato suportado pelo motor bayesiano (Fase 4+).

## Schema

```json
{
  "evidence": {
    "<axis>": { "min": 0.60, "confidence": 0.75 },
    "<axis>": { "max": 0.40, "confidence": 0.70 }
  }
}
```

- `<axis>` ∈ `vigor | harmonia | filtro | presenca | desapego`
- `min` ∈ [0,1] — quem escolheu tem θ **acima** disso (evidência positiva)
- `max` ∈ [0,1] — quem escolheu tem θ **abaixo** disso (evidência negativa)
- `confidence` ∈ [0.5, 0.99] — quão forte é a inferência (default 0.75)
- Cada eixo precisa de pelo menos `min` ou `max`. Pode ter os dois (intervalo).

## Tabela de thresholds

| Semântica       | min/max  | Confidence default |
|-----------------|----------|--------------------|
| muito alto      | min 0.75 | 0.80               |
| alto            | min 0.60 | 0.75               |
| baixo           | max 0.40 | 0.75               |
| muito baixo     | max 0.25 | 0.80               |

## Regras

1. **1 a 3 eixos por opção.** Mais que isso dilui o sinal — o jogador não está sendo mais "informativo", apenas mais ambíguo. O validator rejeita >3.
2. **Trade-off obrigatório quando ≥ 2 eixos:** pelo menos um eixo com `min` (positivo) E um com `max` (negativo). Caso contrário o validator emite warning. Opções "alto em tudo" não revelam preferência — revelam quem nunca abre mão de nada, o que normalmente é uma das opções "evasivas" do deck.
3. **Confidence default 0.75.** Use 0.80+ apenas pra opções extremas onde a leitura é inequívoca; 0.65-0.70 pra nuances.
4. **O texto da opção precisa tornar o trade-off legível.** Se a evidência declara `vigor.min 0.6 + harmonia.max 0.4`, o player tem que conseguir ler a opção como "vou impor postura ainda que a relação azede". Se a opção parece "ganha-ganha" mas a evidência é dura, a calibragem mente.
5. **Eixo dominante vira hold-color.** A opção é colorida no UI pelo eixo com maior `confidence`. Use isso pra decidir qual eixo enfatizar quando há vários.

## Exemplo

```json
{
  "text": "Diz que vai resolver depois e muda de assunto",
  "subtext": "evita o atrito agora",
  "tone": "evasivo",
  "evidence": {
    "harmonia": { "min": 0.60, "confidence": 0.75 },
    "vigor":    { "max": 0.35, "confidence": 0.78 }
  },
  "feedback": "Você ganha tempo, mas o problema fica de pé."
}
```

Quem escolhe está dizendo: prioriza não-confronto (harmonia alta), abre mão de imposição (vigor baixo). Trade-off legível, 2 eixos, confidence consistente.

## Anti-padrões

- **Tudo positivo:** `vigor.min 0.6 + harmonia.min 0.6 + filtro.min 0.6` — opção "perfeita" que ninguém recusaria. Bug de autoria; sempre dilua com pelo menos 1 trade-off.
- **Confidence inflado:** todas opções do deck com `0.95`. O motor bayesiano interpreta isso como certeza absoluta — convergência fica violenta e qualquer ruído distorce. Use 0.95+ só em opções que de fato são reveladoras inquestionáveis.
- **Sem evidência:** `evidence: {}` falha no validator. Não há fallback pra weights legados (foram removidos na Fase 4).

## Validação

```bash
npm run deck:validate
```

Erros bloqueiam build. Warnings são sinal de dilema de autoria — revisar mas não obrigatório.
