#!/usr/bin/env node
/**
 * Smoke test: simula um jogador que abre o app TODOS OS DIAS por 20 dias,
 * resgata o daily, joga 1 deck novo por dia ate acabar calibragem, depois
 * vai comprando os pagos por ordem de preco.
 *
 * Reproduz fielmente os valores do reducer (DAILY_FICHAS, streaks, bonus de
 * primeira vez, conquistas, etc).
 *
 * USO:  node scripts/smoke-20-days.mjs
 */

// === ECONOMIA ATUAL (espelhada de src/types/game.ts) ===
const INITIAL_WALLET = 20;
const DAILY_FICHAS = 10;
const DAILY_STREAK_BONUS_FICHAS = 50;
const DAILY_STREAK_LENGTH = 5;
const DECK_FIRST_TIME_BONUS = 25;
const CALIBRAGEM_COMPLETION_FICHAS = 5;

// === CONQUISTAS (espelhadas de src/data/achievements.ts) ===
const ACHIEVEMENTS = [
  { id: 'primeiro_despertar', title: 'Primeiro Despertar', reward: 10, trigger: 'first_run' },
  { id: 'auto_conhecimento', title: 'Auto-conhecimento', reward: 50, trigger: 'all_calibragem' },
  { id: 'maratona_mental', title: 'Maratona Mental', reward: 30, trigger: '50_questions' },
];

// === DECKS ===
const CALIBRAGEM = [
  { id: 'basic_01', q: 7 },
  { id: 'escolha', q: 7 },
  { id: 'espelho', q: 7 },
  { id: 'limite', q: 7 },
  { id: 'mascara', q: 7 },
  { id: 'roda', q: 7 },
  { id: 'teste', q: 7 },
];

const PAGOS = [
  // Ordenados por preco (mais barato primeiro) — jogador racional
  { id: 'mesa_familia',     price: 100, q: 6, season: 'S1' },
  { id: 'alta_tensao',      price: 100, q: 5, season: 'S0' },
  { id: 'carteira_pesada',  price: 100, q: 6, season: 'S1' },
  { id: 'profissional',     price: 100, q: 5, season: 'S0' },
  { id: 'o_convite',        price: 120, q: 7, season: 'S1' }, // campanha (skip cooldown)
  { id: 'livro_amaldicoado', price: 120, q: 7, season: 'S0' },
  { id: 'holofote',         price: 150, q: 5, season: 'S0' },
  { id: 'a_lamina',         price: 150, q: 6, season: 'S1' },
  { id: 'o_fio',            price: 150, q: 6, season: 'S1' },
  { id: 'social',           price: 200, q: 5, season: 'S0' },
];

// === ESTADO ===
const state = {
  day: 0,
  fichas: INITIAL_WALLET,
  loginStreak: 0,
  totalEarned: INITIAL_WALLET,
  totalSpent: 0,
  totalAnswered: 0,
  ownedDeckIds: [],
  playedDeckIds: new Set(),
  achievements: new Set(),
  totalRuns: 0,
  log: [],
};

function L(msg) { state.log.push(`Dia ${state.day.toString().padStart(2, ' ')}: ${msg}`); }

function checkAchievements() {
  const completedCalib = CALIBRAGEM.filter(d => state.playedDeckIds.has(d.id)).length;
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.has(a.id)) continue;
    let unlock = false;
    if (a.trigger === 'first_run' && state.totalRuns >= 1) unlock = true;
    if (a.trigger === 'all_calibragem' && completedCalib >= 7) unlock = true;
    if (a.trigger === '50_questions' && state.totalAnswered >= 50) unlock = true;
    if (unlock) {
      state.achievements.add(a.id);
      state.fichas += a.reward;
      state.totalEarned += a.reward;
      L(`🏆 Conquista "${a.title}" → +${a.reward} fichas (saldo ${state.fichas})`);
    }
  }
}

function claimDaily() {
  state.loginStreak += 1;
  let reward = DAILY_FICHAS;
  let note = `+${DAILY_FICHAS} daily (streak ${state.loginStreak})`;
  if (state.loginStreak > 0 && state.loginStreak % DAILY_STREAK_LENGTH === 0) {
    reward += DAILY_STREAK_BONUS_FICHAS;
    note += ` + 🔥 bonus ${DAILY_STREAK_BONUS_FICHAS} (ciclo ${DAILY_STREAK_LENGTH}d)`;
  }
  state.fichas += reward;
  state.totalEarned += reward;
  L(`${note} (saldo ${state.fichas})`);
}

function playDeck(deck) {
  state.totalRuns += 1;
  state.totalAnswered += deck.q;
  const firstTime = !state.playedDeckIds.has(deck.id);
  state.playedDeckIds.add(deck.id);
  let reward = 0;
  let notes = [];
  if (firstTime) {
    reward += DECK_FIRST_TIME_BONUS;
    notes.push(`primeira vez +${DECK_FIRST_TIME_BONUS}`);
  }
  if (CALIBRAGEM.some(c => c.id === deck.id) && firstTime) {
    reward += CALIBRAGEM_COMPLETION_FICHAS;
    notes.push(`calibragem +${CALIBRAGEM_COMPLETION_FICHAS}`);
  }
  state.fichas += reward;
  state.totalEarned += reward;
  L(`🎮 Jogou "${deck.id}" (${deck.q} perguntas) → +${reward} (${notes.join(', ') || 'replay sem bonus'}) (saldo ${state.fichas})`);
  checkAchievements();
}

function tryBuyCheapestUnowned() {
  const next = PAGOS.find(d => !state.ownedDeckIds.includes(d.id));
  if (!next) return null;
  if (state.fichas < next.price) {
    L(`💰 Quer "${next.id}" (${next.price}) mas so tem ${state.fichas}. Junta mais.`);
    return null;
  }
  state.fichas -= next.price;
  state.totalSpent += next.price;
  state.ownedDeckIds.push(next.id);
  L(`💎 COMPROU "${next.id}" por ${next.price} fichas (saldo ${state.fichas})`);
  return next;
}

// === SIMULACAO ===
L(`Inicio: saldo ${state.fichas} fichas (INITIAL_WALLET)`);

for (let day = 1; day <= 20; day++) {
  state.day = day;
  claimDaily();

  // Estrategia: 1 calibragem por dia ate acabar (dias 1-7).
  // Depois disso, replay de algum ja jogado + tenta comprar o mais barato.
  if (day <= 7) {
    const next = CALIBRAGEM.find(c => !state.playedDeckIds.has(c.id));
    if (next) playDeck(next);
  } else {
    // Tenta comprar o proximo deck nao-comprado mais barato
    const bought = tryBuyCheapestUnowned();
    if (bought) playDeck(bought);
    else {
      // Sem dinheiro pra comprar — joga um calibragem qualquer pra manter ritmo
      const replay = CALIBRAGEM[day % CALIBRAGEM.length];
      playDeck(replay);
    }
  }
}

// === RELATORIO FINAL ===
console.log('═'.repeat(72));
console.log('  SMOKE TEST — 20 DIAS DE JOGADOR ATIVO');
console.log('═'.repeat(72));
console.log();
state.log.forEach(line => console.log(line));
console.log();
console.log('═'.repeat(72));
console.log('  RESUMO FINAL');
console.log('═'.repeat(72));
console.log(`  Fichas no bolso:      ${state.fichas}`);
console.log(`  Total ganho:          ${state.totalEarned}`);
console.log(`  Total gasto:          ${state.totalSpent}`);
console.log(`  Streak final:         ${state.loginStreak} dias`);
console.log(`  Bonus streak ganhos:  ${Math.floor(state.loginStreak / DAILY_STREAK_LENGTH)} × ${DAILY_STREAK_BONUS_FICHAS} = ${Math.floor(state.loginStreak / DAILY_STREAK_LENGTH) * DAILY_STREAK_BONUS_FICHAS}`);
console.log(`  Total runs:           ${state.totalRuns}`);
console.log(`  Perguntas respondidas: ${state.totalAnswered}`);
console.log(`  Calibragem completa:   ${CALIBRAGEM.filter(c => state.playedDeckIds.has(c.id)).length} / 7`);
console.log(`  Decks pagos:           ${state.ownedDeckIds.length} / ${PAGOS.length}`);
console.log(`  Conquistas:            ${state.achievements.size} / 3 (${[...state.achievements].join(', ')})`);
console.log();
console.log('  Decks comprados:');
state.ownedDeckIds.forEach(id => {
  const d = PAGOS.find(p => p.id === id);
  console.log(`    • ${id} (${d.price} fichas, ${d.season})`);
});
console.log();
const restantes = PAGOS.filter(p => !state.ownedDeckIds.includes(p.id));
console.log(`  Faltam comprar:`);
restantes.forEach(d => console.log(`    • ${d.id} (${d.price} fichas, ${d.season})`));
console.log();
const custoRestante = restantes.reduce((s, d) => s + d.price, 0);
console.log(`  Pra fechar a coleção completa faltam ${custoRestante} fichas`);
console.log(`  Ritmo de ganho liquido (dia 8-20, fase comprador): ~${Math.round((state.totalEarned - INITIAL_WALLET) / 20)} fichas/dia`);
console.log();
