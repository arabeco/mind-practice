#!/usr/bin/env node
/**
 * Compara 3 cenarios de economia ao mesmo tempo nos 6 perfis:
 *   ATUAL   : streak 5d, bonus 50  (hoje)
 *   APERTO  : streak 7d, bonus 35  (A + B suaves)
 *   FORTE   : streak 7d, bonus 35, FTB so nos primeiros 5 decks (A+B+C)
 */

const INITIAL_WALLET = 20;
const DAILY_FICHAS = 10;
const DECK_FIRST_TIME_BONUS = 25;
const CALIBRAGEM_COMPLETION_FICHAS = 5;

const ACHIEVEMENTS = [
  { id: 'primeiro_despertar', reward: 10, trigger: 'first_run' },
  { id: 'auto_conhecimento', reward: 50, trigger: 'all_calibragem' },
  { id: 'maratona_mental', reward: 30, trigger: '50_questions' },
];

const CALIBRAGEM = [
  { id: 'basic_01', q: 7 }, { id: 'escolha', q: 7 }, { id: 'espelho', q: 7 },
  { id: 'limite', q: 7 },   { id: 'mascara', q: 7 }, { id: 'roda', q: 7 },
  { id: 'teste', q: 7 },
];

const PAGOS = [
  { id: 'mesa_familia',      price: 100, q: 6 },
  { id: 'alta_tensao',       price: 100, q: 5 },
  { id: 'carteira_pesada',   price: 100, q: 6 },
  { id: 'profissional',      price: 100, q: 5 },
  { id: 'o_convite',         price: 120, q: 7 },
  { id: 'livro_amaldicoado', price: 120, q: 7 },
  { id: 'holofote',          price: 150, q: 5 },
  { id: 'a_lamina',          price: 150, q: 6 },
  { id: 'o_fio',             price: 150, q: 6 },
  { id: 'social',            price: 200, q: 5 },
];

const SCENARIOS = {
  ATUAL:  { streakLength: 5, streakBonus: 50, ftbCap: Infinity, label: 'ATUAL (5d/+50, FTB sempre)' },
  APERTO: { streakLength: 7, streakBonus: 35, ftbCap: Infinity, label: 'APERTO (7d/+35, FTB sempre)' },
  FORTE:  { streakLength: 7, streakBonus: 35, ftbCap: 5,        label: 'FORTE (7d/+35, FTB só 5 primeiros decks)' },
};

const PROFILES = {
  Perfect:   { days: 30, shouldOpen: () => true, shouldPlay: () => true, iap: () => null },
  Whale:     { days: 30, shouldOpen: () => true, shouldPlay: () => true, iap: (d) => d === 3 ? { fichas: 800 } : null },
  Pagante:   { days: 30, shouldOpen: (d) => ((d-1) % 7) < 4, shouldPlay: (d) => ((d-1) % 7) < 4, iap: (d) => d === 5 ? { fichas: 100 } : null },
  Streaky:   { days: 30, shouldOpen: (d) => ((d-1) % 6) !== 5, shouldPlay: (d) => ((d-1) % 6) !== 5, iap: () => null },
  Casual:    { days: 30, shouldOpen: (d) => [1,3,5].includes((d-1) % 7), shouldPlay: (d) => [1,3,5].includes((d-1) % 7), iap: () => null },
  Onboarder: { days: 30, shouldOpen: (d) => d <= 7, shouldPlay: (d) => d <= 7, iap: () => null },
};

function makeState() {
  return {
    day: 0, fichas: INITIAL_WALLET, loginStreak: 0, lastLoginDay: 0,
    totalEarned: INITIAL_WALLET, totalSpent: 0,
    totalAnswered: 0, ownedDeckIds: [], playedDeckIds: new Set(),
    achievements: new Set(), totalRuns: 0, daysActive: 0,
    decksWithFTB: 0, // contador de decks que JA receberam FTB
  };
}

function checkAchievements(s) {
  const completedCalib = CALIBRAGEM.filter(d => s.playedDeckIds.has(d.id)).length;
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.has(a.id)) continue;
    let unlock = false;
    if (a.trigger === 'first_run' && s.totalRuns >= 1) unlock = true;
    if (a.trigger === 'all_calibragem' && completedCalib >= 7) unlock = true;
    if (a.trigger === '50_questions' && s.totalAnswered >= 50) unlock = true;
    if (unlock) { s.achievements.add(a.id); s.fichas += a.reward; s.totalEarned += a.reward; }
  }
}

function login(s, scenario) {
  if (s.lastLoginDay === s.day - 1) s.loginStreak += 1;
  else s.loginStreak = 1;
  s.lastLoginDay = s.day;
  let reward = DAILY_FICHAS;
  if (s.loginStreak > 0 && s.loginStreak % scenario.streakLength === 0) {
    reward += scenario.streakBonus;
  }
  s.fichas += reward; s.totalEarned += reward;
}

function play(s, deck, scenario) {
  s.totalRuns += 1; s.daysActive += 1; s.totalAnswered += deck.q;
  const firstTime = !s.playedDeckIds.has(deck.id);
  s.playedDeckIds.add(deck.id);
  if (firstTime) {
    // FTB só se ainda dentro da cota do cenário
    if (s.decksWithFTB < scenario.ftbCap) {
      s.fichas += DECK_FIRST_TIME_BONUS;
      s.totalEarned += DECK_FIRST_TIME_BONUS;
      s.decksWithFTB += 1;
    }
    if (CALIBRAGEM.some(c => c.id === deck.id)) {
      s.fichas += CALIBRAGEM_COMPLETION_FICHAS;
      s.totalEarned += CALIBRAGEM_COMPLETION_FICHAS;
    }
  }
  checkAchievements(s);
}

function pickDeck(s) {
  const nextCalib = CALIBRAGEM.find(c => !s.playedDeckIds.has(c.id));
  if (nextCalib) return nextCalib;
  const nextOwned = PAGOS.find(p => s.ownedDeckIds.includes(p.id) && !s.playedDeckIds.has(p.id));
  if (nextOwned) return nextOwned;
  return CALIBRAGEM[s.day % CALIBRAGEM.length];
}

function tryBuy(s) {
  const next = PAGOS.find(d => !s.ownedDeckIds.includes(d.id));
  if (!next || s.fichas < next.price) return null;
  s.fichas -= next.price; s.totalSpent += next.price; s.ownedDeckIds.push(next.id);
  return next;
}

function runProfile(profile, scenario) {
  const s = makeState();
  for (let d = 1; d <= profile.days; d++) {
    s.day = d;
    if (!profile.shouldOpen(d)) continue;
    login(s, scenario);
    const iap = profile.iap(d);
    if (iap) { s.fichas += iap.fichas; s.totalEarned += iap.fichas; }
    tryBuy(s);
    if (profile.shouldPlay(d)) play(s, pickDeck(s), scenario);
  }
  return s;
}

// === EXECUTA ===
const results = {};
for (const sname of Object.keys(SCENARIOS)) {
  results[sname] = {};
  for (const pname of Object.keys(PROFILES)) {
    results[sname][pname] = runProfile(PROFILES[pname], SCENARIOS[sname]);
  }
}

// === RELATÓRIO ===
console.log();
console.log('═'.repeat(94));
console.log('  COMPARATIVO — 3 CENÁRIOS DE ECONOMIA × 6 PERFIS (30 dias)');
console.log('═'.repeat(94));
console.log();
console.log('  Legenda: % coleção total (calibragem + pagos) / 17 decks');
console.log();

const PROF_ORDER = ['Perfect', 'Whale', 'Pagante', 'Streaky', 'Casual', 'Onboarder'];
const SCEN_ORDER = ['ATUAL', 'APERTO', 'FORTE'];

function pctColecao(s) {
  const calib = CALIBRAGEM.filter(c => s.playedDeckIds.has(c.id)).length;
  return Math.round(((calib + s.ownedDeckIds.length) / 17) * 100);
}
function decksPagos(s) { return s.ownedDeckIds.length; }

for (const metric of [
  { name: '% COLEÇÃO TOTAL', fn: pctColecao, fmt: v => v + '%' },
  { name: 'DECKS PAGOS (de 10)', fn: decksPagos, fmt: v => String(v) },
  { name: 'SALDO FINAL', fn: s => s.fichas, fmt: v => String(v) },
]) {
  console.log(`  ${metric.name}`);
  console.log('  ' + ''.padEnd(13) + PROF_ORDER.map(p => p.padStart(11)).join(''));
  console.log('  ' + '─'.repeat(80));
  for (const sname of SCEN_ORDER) {
    let line = '  ' + sname.padEnd(13);
    for (const pname of PROF_ORDER) {
      line += metric.fmt(metric.fn(results[sname][pname])).padStart(11);
    }
    console.log(line);
  }
  console.log();
}

console.log('═'.repeat(94));
console.log('  DELTA — quanto cada perfil PERDE com o aperto');
console.log('═'.repeat(94));
console.log('  ' + ''.padEnd(13) + PROF_ORDER.map(p => p.padStart(11)).join(''));
console.log('  ' + '─'.repeat(80));
for (const sname of ['APERTO', 'FORTE']) {
  let line = '  ' + sname.padEnd(13);
  for (const pname of PROF_ORDER) {
    const delta = pctColecao(results[sname][pname]) - pctColecao(results.ATUAL[pname]);
    const sign = delta === 0 ? ' ' : delta > 0 ? '+' : '';
    line += `${sign}${delta}pp`.padStart(11);
  }
  console.log(line);
}
console.log();
console.log('═'.repeat(94));
