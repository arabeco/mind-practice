# Fase 2 — Engine Narrativa (Design)

**Data:** 2026-04-19
**Status:** Design aprovado, aguardando user review antes do plan.
**Dependências:** Fase 1 (Fundação) — commitada até `853c6bb`.

## Objetivo

Substituir a atribuição de pesos fixa-por-opção por uma engine de **intenção + contexto**:

1. Autor declara na Option **o que o jogador está tentando fazer** (`intent`) e **pesos base leves** (`baseWeights`).
2. Engine resolve os pesos finais em tempo de resposta, acumulando modificadores contextuais derivados da `SceneMetadata` da cena.
3. Curva de tempo real substitui o `timeTempero` atual: resposta rápida não é recompensada, resposta lenta é penalizada.

Efeito prático:

- Corrige o bug atual de "confronto direto em qualquer contexto = +3 vigor", que satura vigor.
- Abre margem autoral: a mesma intenção vale diferente em contextos diferentes, sem duplicar opções.
- Remove o incentivo perverso de "responder rápido pra parecer confiante".

## Escopo

**Incluído:**
- Novo enum `OptionIntent` (8 valores).
- Tabela `CONTEXT_MODIFIERS` em TS, versionada.
- Função pura `resolveWeights(option, metadata, intensity, responseTimeMs)`.
- Função pura `timeFactor(responseTimeMs)` substituindo `timeTempero`.
- Pipeline do reducer `ANSWER` ajustado pra chamar `resolveWeights` e passar `finalWeights` pro `applyDampenedWeights`.
- Fallback de compatibilidade: Options sem `intent+baseWeights` caem no `weights` legado sem quebrar.
- Script one-shot `scripts/retag-options.ts` que propõe `intent + baseWeights` pra cada Option dos 12 decks atuais, com heurística auditada por humano.
- Validator (`scripts/validate-deck.ts`) ganha checks: se `intent` existe, `baseWeights` também; se `intent` é de um valor fora do enum, falha.
- Testes unitários puros + golden test de regressão.

**Fora de escopo (explicitamente):**
- Reescrever narrativa dos decks (ambiguidade do outro, mini-dossiê P2). Isso é Fase 2.5 ou absorvido pela Fase 3.
- Expandir `CONTEXT_MODIFIERS` pra cobrir todo caso teórico. Fase 2 entrega uma tabela enxuta (~3-5 rules/intent); a tabela cresce organicamente com Season 1.
- Mudança de UI (deadline bar, intensity picker, 2-slide rendering já existem).
- Remover `weights` legado dos decks. Enquanto existirem decks sem retag completo validado, o campo fica. Limpeza em commit separado, só após golden test passar.
- Telemetria server-side da engine (pensar em Fase 4 ou depois).

## Decisões fechadas no brainstorming

1. **Scope split**: engine + retag mecânico num ciclo. Reescrita narrativa fora.
2. **Intents — 8 valores** (lista abaixo em "Modelo de dados").
3. **Fórmula**: aditiva + matching acumulativo. Modifiers aplicados ANTES do pipeline tension/intensity/time. Múltiplas rules casando somam por eixo.
4. **Penalidade de tempo**: decay linear a partir de 6s, `<6s → 1.0`, `12s → 0.3`, timeout → 0. Bump de resposta rápida sai.
5. **Backward compat**: mantida durante Fase 2 via fallback no `resolveWeights`.

## Modelo de dados

### `OptionIntent`

```ts
export type OptionIntent =
  | 'confronto_publico'   // bate de frente, na frente de plateia/terceiros
  | 'confronto_privado'   // leva pra conversa fora do palco
  | 'retirada'            // sai, cede, desengaja
  | 'adesao'              // apoia ativamente, concorda, joga junto
  | 'contra_movimento'    // ironia, deflect, marca sem confrontar direto
  | 'investigacao'        // pergunta, pede contexto, ganha tempo
  | 'provocacao'          // ativo-ofensivo: provoca sem resolver
  | 'protecao';           // protege terceiro ou o resultado, não a si
```

Labels PT (pra UI eventual):

```ts
export const OPTION_INTENT_LABELS: Record<OptionIntent, string> = {
  confronto_publico: 'Confronto publico',
  confronto_privado: 'Confronto privado',
  retirada: 'Retirada',
  adesao: 'Adesao',
  contra_movimento: 'Contra-movimento',
  investigacao: 'Investigacao',
  provocacao: 'Provocacao',
  protecao: 'Protecao',
};
```

### `Option` expandido

```ts
export interface Option {
  text: string;
  subtext: string;
  tone: Tone;

  /** @deprecated após retag completo. Fallback quando intent+baseWeights ausentes. */
  weights?: Partial<Record<StatKey, number>>;

  /** Intenção declarada do jogador ao escolher esta opção. */
  intent?: OptionIntent;

  /**
   * Pesos base — "intenção pura", sem contexto.
   * Magnitude sugerida: ±1 a ±2 por eixo. Modifiers contextuais somam em cima.
   */
  baseWeights?: Partial<Record<StatKey, number>>;

  feedback: string;
  aftermath?: string;
  nextSceneId?: string;
  endingId?: string;
}
```

Regra de validação (enforced no `scripts/validate-deck.ts`):
- Se `intent` estiver presente, `baseWeights` é obrigatório.
- Se `baseWeights` estiver presente, `intent` é obrigatório.
- Se nenhum estiver, `weights` é obrigatório (legacy path).

### `ModifierRule` e `CONTEXT_MODIFIERS`

```ts
export interface ModifierRule {
  when: {
    relacao?: Relacao;
    aposta?: Aposta;
    ambiente?: Ambiente;
    pilar?: Pilar;
    tensaoMin?: 1 | 2 | 3 | 4 | 5;
    tensaoMax?: 1 | 2 | 3 | 4 | 5;
  };
  delta: Partial<Record<StatKey, number>>;
}

export const CONTEXT_MODIFIERS: Record<OptionIntent, ModifierRule[]> = {
  confronto_publico: [
    { when: { relacao: 'Autoridade', aposta: 'Status' }, delta: { vigor: +1, filtro: -1 } },
    { when: { relacao: 'Par',        aposta: 'Paz Emocional' }, delta: { harmonia: -1 } },
    { when: { relacao: 'Desconhecido' }, delta: { vigor: -1, presenca: +1 } },
    { when: { tensaoMin: 4 }, delta: { vigor: +1 } },
  ],

  confronto_privado: [
    { when: { relacao: 'Autoridade' }, delta: { filtro: +1, presenca: +1 } },
    { when: { aposta: 'Paz Emocional' }, delta: { harmonia: +1 } },
  ],

  retirada: [
    { when: { tensaoMin: 4 }, delta: { desapego: +1, vigor: -1 } },
    { when: { aposta: 'Paz Emocional' }, delta: { harmonia: +1 } },
    { when: { aposta: 'Status' }, delta: { presenca: -1 } },
  ],

  adesao: [
    { when: { relacao: 'Autoridade' }, delta: { harmonia: +1, presenca: -1 } },
    { when: { relacao: 'Par' }, delta: { harmonia: +1 } },
  ],

  contra_movimento: [
    { when: { tensaoMin: 3 }, delta: { filtro: +1, vigor: +1 } },
    { when: { ambiente: 'Profissional' }, delta: { presenca: +1 } },
  ],

  investigacao: [
    { when: { tensaoMax: 2 }, delta: { filtro: +1 } },
    { when: { tensaoMin: 4 }, delta: { filtro: +1, vigor: -1 } },
    { when: { relacao: 'Autoridade' }, delta: { filtro: +1 } },
  ],

  provocacao: [
    { when: { relacao: 'Autoridade' }, delta: { vigor: +2, harmonia: -1 } },
    { when: { aposta: 'Paz Emocional' }, delta: { harmonia: -1 } },
  ],

  protecao: [
    { when: { ambiente: 'Profissional' }, delta: { presenca: +1, filtro: +1 } },
    { when: { relacao: 'Desconhecido' }, delta: { desapego: +1 } },
  ],
};
```

Total: ~20 rules no seed. Expande com Season 1 conforme necessário.

## Função `resolveWeights`

```ts
export interface ResolvedWeights {
  finalWeights: Partial<Record<StatKey, number>>;
  /** Pra debug/telemetria: mostra base + cada modifier aplicado. */
  breakdown: {
    base: Partial<Record<StatKey, number>>;
    applied: Array<{ ruleIndex: number; delta: Partial<Record<StatKey, number>> }>;
    timeFactor: number;
  };
}

export function resolveWeights(
  option: Option,
  metadata: SceneMetadata,
  responseTimeMs?: number,
): ResolvedWeights;
```

Algoritmo:
1. Se `option.intent` OR `option.baseWeights` ausentes → retorna `{ finalWeights: option.weights ?? {}, breakdown: { base: option.weights ?? {}, applied: [], timeFactor: computed } }`.
2. Senão: parte de `baseWeights` (copy).
3. Pra cada rule em `CONTEXT_MODIFIERS[option.intent]`: se `metadataMatches(rule.when, metadata)`, soma `rule.delta` em finalWeights e registra em `breakdown.applied`.
4. `breakdown.timeFactor = timeFactor(responseTimeMs)` (função separada).
5. Retorna.

`timeFactor` **não é aplicado dentro** de `resolveWeights`. É reportado no breakdown pra telemetria, mas o reducer é quem multiplica (porque o reducer já multiplica tension e intensity; mantém um ponto só de pipeline).

### `metadataMatches`

```ts
function metadataMatches(when: ModifierRule['when'], m: SceneMetadata): boolean {
  if (when.relacao   && when.relacao   !== m.relacao)   return false;
  if (when.aposta    && when.aposta    !== m.aposta)    return false;
  if (when.ambiente  && when.ambiente  !== m.ambiente)  return false;
  if (when.pilar     && when.pilar     !== m.pilar)     return false;
  if (when.tensaoMin && m.tensao < when.tensaoMin)      return false;
  if (when.tensaoMax && m.tensao > when.tensaoMax)      return false;
  return true;
}
```

## Função `timeFactor`

```ts
/**
 * Fator de tempo aplicado ao peso da resposta.
 *
 * Curva:
 *   - responseTimeMs = undefined → 1.0 (não penaliza quando não há info)
 *   - responseTimeMs <= 6000ms   → 1.0
 *   - 6000 < responseTimeMs < 12000 → decay linear de 1.0 até 0.3
 *   - responseTimeMs >= 12000ms  → 0.3 (hard floor, mas na prática já é timeout)
 *
 * Timeout absoluto (dispatch 'TIMEOUT') continua retornando peso {} antes mesmo
 * de chegar aqui — esta função só atende respostas que o jogador de fato deu.
 */
export function timeFactor(responseTimeMs?: number): number {
  if (responseTimeMs === undefined) return 1.0;
  if (responseTimeMs <= 6000) return 1.0;
  if (responseTimeMs >= 12000) return 0.3;
  const t = (responseTimeMs - 6000) / 6000; // 0..1
  return 1.0 - (0.7 * t);
}
```

Substitui `timeTempero` no `applyDampenedWeights`. O bump de "<2s = 1.05" some.

## Mudanças no reducer `ANSWER`

Payload cresce:

```ts
| { type: 'ANSWER';
    option: Option;
    responseTimeMs?: number;
    intensity?: AnswerIntensity }
```

(Substitui o shape atual `{ weights; tone; responseTimeMs; intensity }`. A razão é que `resolveWeights` precisa da Option inteira, não só dos weights.)

No reducer:

```ts
case 'ANSWER': {
  const question = state.activeDeck?.questions[state.currentQuestion];
  if (!question) return state;

  const resolved = resolveWeights(action.option, question.metadata, action.responseTimeMs);

  return {
    ...state,
    calibration: applyDampenedWeights(
      state.calibration,
      resolved.finalWeights,
      action.option.tone,
      question.metadata.tensao,
      action.responseTimeMs,
      action.intensity,
    ),
    activeRun: state.activeRun
      ? appendRunAnswer(
          state.activeRun,
          question.id,
          action.option.tone,
          resolved.finalWeights,
          action.responseTimeMs,
        )
      : state.activeRun,
  };
}
```

`applyDampenedWeights` continua recebendo weights já resolvidos. Internamente, troca `timeTempero(responseTimeMs)` por `timeFactor(responseTimeMs)`.

### Mudança em `src/app/play/[deckId]/page.tsx`

`handleResolvedAnswer` passa a Option inteira:

```ts
const handleResolvedAnswer = useCallback((option: Option, responseTimeMs: number, intensity?: AnswerIntensity) => {
  dispatch({ type: 'ANSWER', option, responseTimeMs, intensity });
  playUiCue('hold-confirm');
  vibrate(18);
}, [dispatch, playUiCue, vibrate]);
```

Mesma mudança em callers similares (`QuickScene`, etc.) — a interface do handler já recebe Option.

## Arquivos criados / modificados

### Criados

- `src/lib/narrativeEngine/index.ts` — barrel.
- `src/lib/narrativeEngine/intents.ts` — `OptionIntent` + labels.
- `src/lib/narrativeEngine/contextModifiers.ts` — `ModifierRule` + tabela.
- `src/lib/narrativeEngine/resolveWeights.ts` — resolve + metadataMatches.
- `src/lib/narrativeEngine/timeFactor.ts` — curva de tempo.
- `src/lib/narrativeEngine/__tests__/resolveWeights.test.ts`
- `src/lib/narrativeEngine/__tests__/timeFactor.test.ts`
- `src/lib/narrativeEngine/__tests__/metadataMatches.test.ts`
- `scripts/retag-options.ts` — one-shot, auto-suggest + grava.
- `scripts/compare-engine-golden.ts` — golden test (roda 10 fixtures antes/depois, compara axes).

### Modificados

- `src/types/game.ts` — `Option` ganha `intent?`, `baseWeights?`; `weights` fica opcional + marcado `@deprecated`.
- `src/context/GameContext.tsx` — `GameAction.ANSWER` payload muda; reducer `ANSWER` chama `resolveWeights`; `applyDampenedWeights` usa `timeFactor` em vez de `timeTempero` (função interna `timeTempero` removida).
- `src/app/play/[deckId]/page.tsx` — `handleResolvedAnswer` passa Option inteira no dispatch.
- `src/components/play/QuickScene.tsx` — se houver um caller interno de dispatch, atualizar pra novo shape (confirmar na implementação — talvez só a tipagem do callback).
- `scripts/validate-deck.ts` — ganha regras: se `intent` sem `baseWeights` → erro; se `intent` fora do enum → erro; se nenhum de `intent/weights` → erro.
- `src/data/decks/*.json` — todos os 12 decks ganham `intent + baseWeights` nas Options via script; `weights` mantido como legado durante Fase 2.

## Script de retag — heurística

`scripts/retag-options.ts` sugere intent por (tone, strongestPositiveAxis, magnitude):

| tone | eixo dominante positivo | intent sugerido |
|---|---|---|
| `provocativo` | vigor ≥ 2 | `confronto_publico` |
| `provocativo` | vigor < 2 ou outro | `provocacao` |
| `pragmatico` | vigor ≥ 2 + filtro ≥ 1 | `confronto_privado` |
| `pragmatico` | filtro ≥ 2 (só) | `investigacao` |
| `pragmatico` | desapego ≥ 2 | `retirada` |
| `protetor` | filtro ≥ 1 ou harmonia ≥ 2 | `protecao` |
| `evasivo` | desapego ≥ 1 | `retirada` |
| `evasivo` | outros | `contra_movimento` |
| `neutro` | harmonia ≥ 2 | `adesao` |
| `neutro` | filtro ≥ 1 | `investigacao` |
| `neutro` | presenca ≥ 1 | `adesao` |

`baseWeights` sugerido: cada valor de `weights` atual dividido por 2 e arredondado (porque modifier soma em cima). Edge cases (divisão que zera eixos importantes) ficam flagueados pro humano corrigir.

Output do script:
1. Escreve o JSON modificado.
2. Imprime um diff legível por Option modificada (`deckId › questionId › optionIndex: intent=X, base=Y, antes weights=Z`).
3. Humano revisa os 12 decks, ajusta manualmente o que ficou estranho, commita.

## Testes

### Unitários (vitest ou node:test — que já for o padrão)

**`timeFactor.test.ts`:**
- `undefined → 1.0`
- `0ms → 1.0`, `6000ms → 1.0`
- `9000ms → 0.65` (meio da rampa)
- `12000ms → 0.3`
- `15000ms → 0.3` (clamp)

**`metadataMatches.test.ts`:**
- `when:{}` casa qualquer metadata.
- `when:{relacao:'Par'}` casa só `Par`.
- `when:{tensaoMin:4}` casa tensao 4 e 5, não 3.
- `when:{tensaoMin:3, tensaoMax:4}` casa tensao 3 e 4 só.
- Combinações múltiplas são AND.

**`resolveWeights.test.ts`:**
- Legacy path: Option só com `weights` → `finalWeights = weights`, `breakdown.applied = []`.
- `intent='retirada', baseWeights={desapego:1}` + metadata `{tensao:5, aposta:'Paz Emocional'}` → 2 rules casam, delta soma, finalWeights reflete.
- Intent desconhecido (garantir não-crash): defensive, retorna baseWeights sem aplicar nada.
- Missing `baseWeights` quando `intent` presente: retorna `{}` + log warn.

### Golden (regressão narrativa)

`scripts/compare-engine-golden.ts`:
- Fixtures: 10 cenas tiradas dos decks atuais (alta_tensao, social, profissional, etc.), com escolha específica e responseTime fixo.
- Roda o pipeline antigo (weights fixos) e anota axes resultantes.
- Roda o pipeline novo (retag + resolveWeights) e compara.
- **Tolerância**: axes por cena podem divergir até 30% (intencional: o objetivo é corrigir vigor saturado). Reportar o delta por eixo.
- Não é assertivo — é auditoria visual pra o autor validar "sim, o vigor caiu no contexto certo, a harmonia subiu onde esperado".

## Erros / edge cases

| Caso | Comportamento |
|---|---|
| Option só com `weights` (legacy) | Usa `weights` direto, sem modifiers. |
| Option com `intent` mas sem `baseWeights` | `resolveWeights` retorna `{}` + `console.warn` em dev. Validator bloqueia isso em prod. |
| `intent` fora do enum | TypeScript bloqueia em compile; runtime defensive: retorna baseWeights sem aplicar modifiers. |
| `CONTEXT_MODIFIERS[intent]` vazio (intent sem rules) | Retorna baseWeights (sem delta). Intencional — alguns intents podem não precisar de contexto. |
| `responseTimeMs = undefined` | `timeFactor = 1.0`. Aparece em testes e em decks `format:'quick'` que possam não medir tempo. |
| Timeout absoluto (`TIMEOUT` action) | Continua como hoje: `weights:{}`, sem calibração, `timedOut:true`. `resolveWeights` nem é chamado. |
| Múltiplas rules no mesmo eixo | Somam. Intencional. |
| `baseWeights` com eixo que nenhum modifier mexe | Passa direto. |

## Riscos e mitigações

- **Retag quebra silenciosamente o "sabor" de algum deck atual** → golden test + revisão humana do diff do script antes de commitar.
- **Tabela de modifiers fica grande e difícil de raciocinar sobre** → começa com 20 rules, cada rule comentada com exemplo. Crescer só com autor novo testando e medindo.
- **Acoplar `applyDampenedWeights` ao novo pipeline quebra tests existentes** → mantém assinatura (`weights` já resolvidos entram); só troca `timeTempero` por `timeFactor` internamente.
- **Autor acha as regras pouco previsíveis** → o `breakdown` do `resolveWeights` expõe passo-a-passo; DevTools pode ganhar um inspector depois (fora de escopo Fase 2).
- **`intensity` quebrar o timing** — hoje `intensity` é selecionada depois da opção. Verificar no plan que a tela de intensity não estoura o timeout (deveria congelar o timer quando o player escolhe). Se isso não for o caso, fix inline durante Fase 2.

## Critério de sucesso

- Todos os 12 decks atuais têm `intent + baseWeights` em 100% das Options.
- Golden test mostra vigor **médio** por run caindo pelo menos 10% nos decks que saturavam (alta_tensao, holofote), com outros eixos subindo proporcionalmente.
- `tsc` limpo, `validate-deck` passa.
- Testes unitários do narrativeEngine: 100% verde.
- `resolveWeights` é função pura sem side effects (garantido por ausência de imports de React/context).

## Fase 2.5 (separada, futuro próximo)

- Reescrita narrativa dos decks Season 0 não-calibragem (P1 outro ambíguo, P2 dossiê completo).
- Expansão da tabela de modifiers com regras descobertas na escrita de Season 1.
- Eventual UI de "ver breakdown" pra o autor (DevTools).
- Remoção do campo `weights` legado e da tipagem opcional de `intent/baseWeights`.
