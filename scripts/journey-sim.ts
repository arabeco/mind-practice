/**
 * Simulação de jornada do jogador — valida a economia de fichas (v2) usando o
 * reducer REAL. Não toca DOM/React.  Rodar:  node --import tsx scripts/journey-sim.ts
 *
 * Modelo v2 "começo generoso, parede escassa":
 *   - Diário: DAILY_FICHAS (login) + streak; SEM grind por run.
 *   - Onboarding: DECK_FIRST_TIME_BONUS por deck na 1ª vez (+ calibragem na 1ª).
 *   - Campanha: bônus de final.
 */
import { gameReducer, initialState, type GameAction } from '@/context/gameReducer';
import { getDeckById } from '@/data/decks/index';
import {
  DAILY_FICHAS,
  DAILY_STREAK_BONUS_FICHAS,
  DAILY_STREAK_LENGTH,
  DECK_FIRST_TIME_BONUS,
  CAMPAIGN_ENDING_BONUS,
} from '@/types/game';
import { CALIBRAGEM_COMPLETION_FICHAS } from '@/lib/gameStats';
import { FICHA_SPEND_CATALOG } from '@/constants/billingCatalog';
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
function playDeck(deck: Deck, opts: { timeout?: boolean } = {}) {
  dispatch({ type: 'START_DECK', deck });
  deck.questions.forEach((q, i) => {
    if (opts.timeout && i === 0) dispatch({ type: 'TIMEOUT' });
    else dispatch({ type: 'ANSWER', option: q.options[0], responseTimeMs: 2500 });
    dispatch({ type: 'NEXT_QUESTION' });
  });
  dispatch({ type: 'FINISH_DECK' });
}

const CAL = CALIBRAGEM_COMPLETION_FICHAS;
const FT = DECK_FIRST_TIME_BONUS;
const basic = getDeckById('basic_01')!;
const espelho = getDeckById('espelho')!;
const mascara = getDeckById('mascara')!;
const roda = getDeckById('roda')!;

console.log('\n🎮 JORNADA DO JOGADOR — economia v2 (reducer real)\n');
console.log(`  Diário: login ${DAILY_FICHAS} + streak ${DAILY_STREAK_BONUS_FICHAS} a cada ${DAILY_STREAK_LENGTH} dias · 1ª-vez-deck ${FT} · calibragem ${CAL} · campanha ${CAMPAIGN_ENDING_BONUS}`);
log('estado inicial (INITIAL_WALLET)');

// ---- Dia 1: onboarding generoso -------------------------------------------
console.log('\n  ── DIA 1 (onboarding) ──');
let b = w().fichas;
dispatch({ type: 'CLAIM_DAILY' });
log('CLAIM_DAILY (login)', DAILY_FICHAS, b);

b = w().fichas; playDeck(basic);
log('basic_01 (calibragem, 1ª vez)', FT + CAL, b);
b = w().fichas; playDeck(espelho);
log('espelho (calibragem, 1ª vez)', FT + CAL, b);
b = w().fichas; playDeck(mascara, { timeout: true });
log('mascara (timeout, 1ª vez)', FT + CAL, b);       // timeout não penaliza mais (sem bônus de run)
b = w().fichas; playDeck(roda);
log('roda (calibragem, 1ª vez)', FT + CAL, b);

// ---- Escassez: replay não rende nada --------------------------------------
console.log('\n  ── ESCASSEZ (replay = 0) ──');
b = w().fichas; playDeck(basic);
log('basic_01 replay', 0, b);
b = w().fichas; playDeck(espelho);
log('espelho replay', 0, b);

// ---- Loja: gasto + bloqueio ------------------------------------------------
console.log('\n  ── LOJA ──');
b = w().fichas; dispatch({ type: 'EARN_FICHAS', amount: 200, reason: 'sim-topup' });
log('EARN_FICHAS +200 (top-up sim)', 200, b);
const cenario = getDeckById('alta_tensao')!; // 100
b = w().fichas;
dispatch({ type: 'SPEND_FICHAS', amount: cenario.priceFichas ?? 0, itemId: cenario.deckId });
log(`SPEND ${cenario.deckId} (cenário ${cenario.priceFichas})`, -(cenario.priceFichas ?? 0), b);
b = w().fichas; dispatch({ type: 'SPEND_FICHAS', amount: 99999, itemId: 'x' });
log('SPEND 99999 (insuficiente → bloqueia)', 0, b);

// ---- Campanha --------------------------------------------------------------
console.log('\n  ── CAMPANHA ──');
const conv = getDeckById('o_convite')!;
const endingOpt = (() => { for (const q of conv.questions) { const o = q.options.find(x => x.endingId); if (o) return { sceneId: q.id, opt: o }; } return null; })();
const fScene = conv.questions[0];
b = w().fichas;
dispatch({ type: 'CAMPAIGN_START', seasonId: 'season-1', deck: conv });
dispatch({ type: 'CAMPAIGN_ANSWER', seasonId: 'season-1', sceneId: endingOpt?.sceneId ?? fScene.id, optionIndex: 0, nextSceneId: null, endingId: endingOpt?.opt.endingId ?? 'e1', tone: endingOpt?.opt.tone ?? fScene.options[0].tone, evidence: endingOpt?.opt.evidence ?? fScene.options[0].evidence });
log(`CAMPANHA final (bônus ${CAMPAIGN_ENDING_BONUS})`, CAMPAIGN_ENDING_BONUS, b);

// ---- Renda em regime + tabela de afford ------------------------------------
const steadyDaily = DAILY_FICHAS + Math.round(DAILY_STREAK_BONUS_FICHAS / DAILY_STREAK_LENGTH);
console.log('\n  ── RENDA DIÁRIA EM REGIME ──');
console.log(`  ~${steadyDaily} fichas/dia  (login ${DAILY_FICHAS} + streak ${DAILY_STREAK_BONUS_FICHAS}/${DAILY_STREAK_LENGTH}d amortizado)`);
console.log(`  1ª semana (com bônus de 1ª vez) rende MUITO mais → leva ao arquétipo → compartilha (viral)\n`);

// preços reais do catálogo
const catalogDecks = ['alta_tensao','a_lamina','o_fio','holofote','mesa_familia','carteira_pesada','profissional','social','livro_amaldicoado','o_convite']
  .map(id => getDeckById(id)!);
const totalCatalog = catalogDecks.reduce((s, d) => s + (d.priceFichas ?? 0), 0);

console.log('  Dias de f2p (regime) pra cada item:');
const items: Array<[string, number]> = [
  ['Deck cenário (100)', 100],
  ['Deck eixo (150)', 150],
  ['Deck campanha (120)', 120],
  ['Deck premium (200)', 200],
  [`Pro c/ fichas (${FICHA_SPEND_CATALOG.pro.priceFichas})`, FICHA_SPEND_CATALOG.pro.priceFichas],
  [`Founder c/ fichas (${FICHA_SPEND_CATALOG.founder.priceFichas})`, FICHA_SPEND_CATALOG.founder.priceFichas],
  [`CATÁLOGO INTEIRO (${totalCatalog})`, totalCatalog],
];
for (const [nome, custo] of items) console.log(`    ${nome.padEnd(30)} ≈ ${String(Math.ceil(custo / steadyDaily)).padStart(3)} dias`);

console.log('\n  Impacto dos packs IAP (R$) — quanto do catálogo cada um cobre:');
for (const [nome, qtd] of [['fichas_100', 100], ['fichas_300 (+350)', 350], ['fichas_700 (+800)', 800]] as Array<[string, number]>) {
  console.log(`    ${nome.padEnd(20)} = ${qtd} fichas  → ${Math.round(qtd / totalCatalog * 100)}% do catálogo  (${(qtd / steadyDaily).toFixed(0)} dias de grind)`);
}
// Sanidade: nenhum pack único compra o catálogo inteiro nem o Founder.
if (800 >= totalCatalog) problems.push('pack 800 compra catálogo inteiro — forte demais');
if (800 >= FICHA_SPEND_CATALOG.founder.priceFichas) problems.push('pack 800 compra Founder — quebrado');

// ---- Invariantes -----------------------------------------------------------
console.log('\n  ── INVARIANTES ──');
const reconstructed = w().totalEarned - w().totalSpent;
const checks: Array<[string, boolean, string]> = [
  ['fichas >= 0', w().fichas >= 0, `${w().fichas}`],
  ['earned >= spent', w().totalEarned >= w().totalSpent, `${w().totalEarned} vs ${w().totalSpent}`],
  ['earned - spent == saldo', reconstructed === w().fichas, `${reconstructed} vs ${w().fichas}`],
];
for (const [n, ok, d] of checks) { console.log(`  ${n.padEnd(26)} ${ok ? '✅' : '❌'} (${d})`); if (!ok) problems.push(n + ' falhou'); }

console.log('\n────────────────────────────────────────────');
if (problems.length === 0) { console.log('🎉 Economia v2 consistente, escassa e com packs balanceados.\n'); process.exit(0); }
console.log(`⚠️  ${problems.length} problema(s):`); problems.forEach(p => console.log('   - ' + p)); console.log(''); process.exit(1);
