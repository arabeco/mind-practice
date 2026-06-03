/**
 * Simulação de jornada do jogador — exercita e VALIDA a economia de fichas
 * usando o reducer REAL (mesmo código do app). Não toca DOM/React.
 *
 * Rodar:  node --import tsx scripts/journey-sim.ts
 *
 * Cobre: ganhos por run, cap diário, fechamento das torneiras (replay),
 * gasto/bloqueio, campanha, reconciliação contábil, e um relatório de
 * "dias pra comprar" cada item (escassez vs. impacto).
 */
import { gameReducer, initialState, type GameAction } from '@/context/gameReducer';
import { getDeckById } from '@/data/decks/index';
import {
  DAILY_FICHAS,
  RUN_PISO_FICHAS,
  RUN_PISO_CAP_PER_DAY,
  FIRST_RUN_OF_DAY_BONUS,
  NO_TIMEOUT_RUN_BONUS,
  DECK_FIRST_TIME_BONUS,
  CAMPAIGN_ENDING_BONUS,
} from '@/types/game';
import { CALIBRAGEM_COMPLETION_FICHAS } from '@/lib/gameStats';
import type { GameState, Deck } from '@/types/game';

let state: GameState = structuredClone(initialState);
let step = 0;
const problems: string[] = [];

const w = () => state.wallet;
function log(label: string, expectDelta?: number, before?: number) {
  step++;
  const fichas = w().fichas;
  let deltaStr = '';
  if (before !== undefined) {
    const delta = fichas - before;
    const sign = delta >= 0 ? '+' : '';
    deltaStr = `  (${sign}${delta})`;
    if (expectDelta !== undefined && delta !== expectDelta) {
      problems.push(`PASSO ${step} "${label}": esperava ${expectDelta >= 0 ? '+' : ''}${expectDelta}, deu ${sign}${delta}`);
      deltaStr += ` ⚠ esperado ${expectDelta >= 0 ? '+' : ''}${expectDelta}`;
    }
  }
  console.log(
    `  ${String(step).padStart(2)}. ${label.padEnd(40)} fichas=${String(fichas).padStart(4)}` +
    `  earned=${String(w().totalEarned).padStart(4)} spent=${String(w().totalSpent).padStart(4)}${deltaStr}`,
  );
}

function dispatch(a: GameAction) { state = gameReducer(state, a); }

/** Joga um deck inteiro: START → ANSWER+NEXT por questão → FINISH. */
function playDeck(deck: Deck, opts: { timeout?: boolean } = {}) {
  dispatch({ type: 'START_DECK', deck });
  deck.questions.forEach((q, i) => {
    if (opts.timeout && i === 0) dispatch({ type: 'TIMEOUT' });
    else dispatch({ type: 'ANSWER', option: q.options[0], responseTimeMs: 2500 });
    dispatch({ type: 'NEXT_QUESTION' });
  });
  dispatch({ type: 'FINISH_DECK' });
}

const CAL = CALIBRAGEM_COMPLETION_FICHAS; // 5
const basic = getDeckById('basic_01')!;
const espelho = getDeckById('espelho')!;
const mascara = getDeckById('mascara')!;
const roda = getDeckById('roda')!;
const teste = getDeckById('teste')!;
const limite = getDeckById('limite')!;

console.log('\n🎮 JORNADA DO JOGADOR — economia de fichas (reducer real)\n');
console.log(`  Valores: login=${DAILY_FICHAS} piso=${RUN_PISO_FICHAS}×${RUN_PISO_CAP_PER_DAY} 1ª-do-dia=${FIRST_RUN_OF_DAY_BONUS} sem-timeout=${NO_TIMEOUT_RUN_BONUS} 1ª-vez-deck=${DECK_FIRST_TIME_BONUS} calibragem=${CAL} campanha=${CAMPAIGN_ENDING_BONUS}`);
log('estado inicial (INITIAL_WALLET)');

// ---- Dia 1: onboarding (bônus de 1ª vez generosos) ------------------------
console.log('\n  ── DIA 1 (onboarding) ──');
let b = w().fichas;
dispatch({ type: 'CLAIM_DAILY' });
log('CLAIM_DAILY (login)', DAILY_FICHAS, b);

b = w().fichas; playDeck(basic);
log('basic_01 (run1, 1ª vez)', RUN_PISO_FICHAS + FIRST_RUN_OF_DAY_BONUS + NO_TIMEOUT_RUN_BONUS + DECK_FIRST_TIME_BONUS + CAL, b);

b = w().fichas; playDeck(espelho);
log('espelho (run2, 1ª vez)', RUN_PISO_FICHAS + NO_TIMEOUT_RUN_BONUS + DECK_FIRST_TIME_BONUS + CAL, b);

b = w().fichas; playDeck(basic);
log('basic_01 repeat (run3)', RUN_PISO_FICHAS + NO_TIMEOUT_RUN_BONUS, b); // calibragem NÃO paga de novo

b = w().fichas; playDeck(mascara, { timeout: true });
log('mascara (run4, timeout, 1ª vez)', RUN_PISO_FICHAS + DECK_FIRST_TIME_BONUS + CAL, b); // sem no-timeout

b = w().fichas; playDeck(roda);
log('roda (run5, 1ª vez)', RUN_PISO_FICHAS + NO_TIMEOUT_RUN_BONUS + DECK_FIRST_TIME_BONUS + CAL, b);

// ---- TORNEIRA FECHADA: além do cap diário, replay rende quase nada --------
console.log('\n  ── ESCASSEZ: além do cap de runs/dia ──');
b = w().fichas; playDeck(teste);
log('teste (run6, 1ª vez, >cap)', DECK_FIRST_TIME_BONUS + CAL, b); // sem piso, sem no-timeout

b = w().fichas; playDeck(limite);
log('limite (run7, 1ª vez, >cap)', DECK_FIRST_TIME_BONUS + CAL, b);

// replay de deck já dominado, além do cap → ZERO (a prova da escassez)
b = w().fichas; playDeck(basic);
log('basic_01 replay (run8, >cap)', 0, b);
b = w().fichas; playDeck(espelho);
log('espelho replay (run9, >cap)', 0, b);

// ---- Loja: gasto + bloqueio ------------------------------------------------
console.log('\n  ── LOJA ──');
b = w().fichas;
dispatch({ type: 'EARN_FICHAS', amount: 600, reason: 'sim-topup' });
log('EARN_FICHAS +600 (top-up sim)', 600, b);

const oFio = getDeckById('o_fio')!;
b = w().fichas;
dispatch({ type: 'SPEND_FICHAS', amount: oFio.priceFichas ?? 0, itemId: 'o_fio' });
log(`SPEND o_fio (eixo ${oFio.priceFichas})`, -(oFio.priceFichas ?? 0), b);

b = w().fichas;
dispatch({ type: 'SPEND_FICHAS', amount: 99999, itemId: 'impossivel' });
log('SPEND 99999 (insuficiente → bloqueia)', 0, b);

// ---- Campanha --------------------------------------------------------------
console.log('\n  ── CAMPANHA ──');
const conv = getDeckById('o_convite')!;
const endingOpt = (() => {
  for (const q of conv.questions) {
    const opt = q.options.find(o => o.endingId);
    if (opt) return { sceneId: q.id, opt };
  }
  return null;
})();
const fScene = conv.questions[0];
b = w().fichas;
dispatch({ type: 'CAMPAIGN_START', seasonId: 'season-1', deck: conv });
dispatch({
  type: 'CAMPAIGN_ANSWER', seasonId: 'season-1',
  sceneId: endingOpt?.sceneId ?? fScene.id, optionIndex: 0, nextSceneId: null,
  endingId: endingOpt?.opt.endingId ?? 'e1',
  tone: endingOpt?.opt.tone ?? fScene.options[0].tone,
  evidence: endingOpt?.opt.evidence ?? fScene.options[0].evidence,
});
log(`CAMPANHA final (bônus ${CAMPAIGN_ENDING_BONUS})`, CAMPAIGN_ENDING_BONUS, b);

// ---- Renda diária em REGIME (sem 1ª-vez, decks dominados) ------------------
// Steady-state = login + 5 runs (piso + no-timeout) + 1ª-do-dia.
const steadyDaily =
  DAILY_FICHAS +
  RUN_PISO_CAP_PER_DAY * (RUN_PISO_FICHAS + NO_TIMEOUT_RUN_BONUS) +
  FIRST_RUN_OF_DAY_BONUS;

console.log('\n  ── RENDA DIÁRIA EM REGIME (f2p engajado) ──');
console.log(`  ~${steadyDaily} fichas/dia  (login ${DAILY_FICHAS} + 5×(piso ${RUN_PISO_FICHAS}+sem-timeout ${NO_TIMEOUT_RUN_BONUS}) + 1ª-do-dia ${FIRST_RUN_OF_DAY_BONUS})`);
console.log(`  +${CAMPAIGN_ENDING_BONUS} por final de campanha · +bônus de streak semanal\n`);

const itens: Array<[string, number]> = [
  ['Deck cenário (250)', 250],
  ['Deck eixo (500)', 500],
  ['Campanha (200)', 200],
  ['Pro c/ fichas (1000)', 1000],
  ['Founder c/ fichas (8000)', 8000],
];
console.log('  Dias de f2p puro pra bancar cada item:');
for (const [nome, custo] of itens) {
  const dias = Math.ceil(custo / steadyDaily);
  console.log(`    ${nome.padEnd(26)} ≈ ${String(dias).padStart(3)} dias`);
}
console.log('\n  Impacto dos packs IAP (atalho, R$):');
for (const [nome, qtd] of [['fichas_100', 100], ['fichas_300 (+350)', 350], ['fichas_700 (+800)', 800]] as Array<[string, number]>) {
  console.log(`    ${nome.padEnd(20)} = ${qtd} fichas  ≈ ${(qtd / steadyDaily).toFixed(1)} dias de grind`);
}
// O maior pack (800) NÃO pode comprar tudo nem bancar Pro sozinho — sanidade.
const biggestPack = 800;
if (biggestPack >= 1000) problems.push('pack de 800 banca Pro inteiro sozinho — forte demais');
if (biggestPack >= 8000) problems.push('pack de 800 banca Founder — quebrado');

// ---- Invariantes -----------------------------------------------------------
console.log('\n  ── INVARIANTES ──');
const okNonNeg = w().fichas >= 0;
const okEarnedGteSpent = w().totalEarned >= w().totalSpent;
const reconstructed = w().totalEarned - w().totalSpent;
const okReconcile = reconstructed === w().fichas;
console.log(`  fichas >= 0 ............... ${okNonNeg ? '✅' : '❌'} (${w().fichas})`);
console.log(`  totalEarned >= totalSpent . ${okEarnedGteSpent ? '✅' : '❌'} (${w().totalEarned} vs ${w().totalSpent})`);
console.log(`  earned - spent == saldo ... ${okReconcile ? '✅' : '❌'} (${reconstructed} vs ${w().fichas})`);
if (!okNonNeg) problems.push('saldo negativo');
if (!okEarnedGteSpent) problems.push('totalSpent > totalEarned');
if (!okReconcile) problems.push(`reconciliação: earned-spent=${reconstructed} != saldo=${w().fichas}`);

console.log('\n────────────────────────────────────────────');
if (problems.length === 0) {
  console.log('🎉 Economia consistente + escassa — nenhuma divergência.\n');
  process.exit(0);
} else {
  console.log(`⚠️  ${problems.length} problema(s):`);
  problems.forEach(p => console.log('   - ' + p));
  console.log('');
  process.exit(1);
}
