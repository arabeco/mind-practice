#!/usr/bin/env node
/**
 * Smoke test multi-persona: simula 5 perfis tipicos de jogador e compara
 * o que cada um consegue em 30 dias.
 *
 * Perfis:
 *   1. Perfect    — login todo dia + joga todo dia
 *   2. Casual     — joga 3x/semana, perde streak
 *   3. Streaky    — joga 5 dias, pula 1, repete (streak reseta toda semana)
 *   4. Onboarder  — entra entusiasmado, joga 7 dias, abandona
 *   5. Pagante    — joga moderado + compra pack R$ 4,90 (100 fichas) no dia 5
 *   6. Whale      — pack R$ 24,90 (800 fichas) no dia 3 + joga moderado
 */

const INITIAL_WALLET = 20;
const DAILY_FICHAS = 10;
const DAILY_STREAK_BONUS_FICHAS = 50;
const DAILY_STREAK_LENGTH = 5;
const DECK_FIRST_TIME_BONUS = 25;
const CALIBRAGEM_COMPLETION_FICHAS = 5;

const ACHIEVEMENTS = [
  { id: 'primeiro_despertar', reward: 10, trigger: 'first_run' },
  { id: 'auto_conhecimento', reward: 50, trigger: 'all_calibragem' },
  { id: 'maratona_mental', reward: 30, trigger: '50_questions' },
];

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

function makeState() {
  return {
    day: 0,
    fichas: INITIAL_WALLET,
    loginStreak: 0,
    lastLoginDay: 0,
    totalEarned: INITIAL_WALLET,
    totalSpent: 0,
    totalSpentFiat: 0,
    totalAnswered: 0,
    ownedDeckIds: [],
    playedDeckIds: new Set(),
    achievements: new Set(),
    totalRuns: 0,
    daysActive: 0,
    daysOpen: 0,
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
    if (unlock) {
      s.achievements.add(a.id);
      s.fichas += a.reward;
      s.totalEarned += a.reward;
    }
  }
}

function login(s) {
  s.daysOpen += 1;
  // Streak: continua so se entrou ONTEM
  if (s.lastLoginDay === s.day - 1) {
    s.loginStreak += 1;
  } else {
    s.loginStreak = 1; // reset
  }
  s.lastLoginDay = s.day;
  let reward = DAILY_FICHAS;
  if (s.loginStreak > 0 && s.loginStreak % DAILY_STREAK_LENGTH === 0) {
    reward += DAILY_STREAK_BONUS_FICHAS;
  }
  s.fichas += reward;
  s.totalEarned += reward;
}

function play(s, deck) {
  s.totalRuns += 1;
  s.daysActive += 1;
  s.totalAnswered += deck.q;
  const firstTime = !s.playedDeckIds.has(deck.id);
  s.playedDeckIds.add(deck.id);
  if (firstTime) {
    s.fichas += DECK_FIRST_TIME_BONUS;
    s.totalEarned += DECK_FIRST_TIME_BONUS;
    if (CALIBRAGEM.some(c => c.id === deck.id)) {
      s.fichas += CALIBRAGEM_COMPLETION_FICHAS;
      s.totalEarned += CALIBRAGEM_COMPLETION_FICHAS;
    }
  }
  checkAchievements(s);
}

function pickDeckToPlay(s) {
  // 1. Calibragem nao jogado
  const nextCalib = CALIBRAGEM.find(c => !s.playedDeckIds.has(c.id));
  if (nextCalib) return nextCalib;
  // 2. Pago nao jogado (que eu ja possuo)
  const nextOwnedNotPlayed = PAGOS.find(p => s.ownedDeckIds.includes(p.id) && !s.playedDeckIds.has(p.id));
  if (nextOwnedNotPlayed) return nextOwnedNotPlayed;
  // 3. Replay
  return CALIBRAGEM[s.day % CALIBRAGEM.length];
}

function tryBuyCheapest(s) {
  const next = PAGOS.find(d => !s.ownedDeckIds.includes(d.id));
  if (!next || s.fichas < next.price) return null;
  s.fichas -= next.price;
  s.totalSpent += next.price;
  s.ownedDeckIds.push(next.id);
  return next;
}

function iapBuy(s, fichas, brl) {
  s.fichas += fichas;
  s.totalEarned += fichas;
  s.totalSpentFiat += brl;
}

// === PERFIS (retornam { plays: bool, buys: bool } por dia) ===
const PROFILES = {
  Perfect: {
    days: 30,
    shouldOpen: (d) => true,
    shouldPlay: (d) => true,
    shouldBuyDeck: (d) => true,
    iap: () => null,
  },
  Casual: {
    days: 30,
    // 3x por semana: seg, qua, sex (1, 3, 5, 8, 10, 12, ...)
    shouldOpen: (d) => [1, 3, 5].includes((d - 1) % 7),
    shouldPlay: (d) => [1, 3, 5].includes((d - 1) % 7),
    shouldBuyDeck: (d) => true,
    iap: () => null,
  },
  Streaky: {
    days: 30,
    // 5 dias seguidos, pula 1, repete (streak quase nunca passa de 5)
    shouldOpen: (d) => ((d - 1) % 6) !== 5,
    shouldPlay: (d) => ((d - 1) % 6) !== 5,
    shouldBuyDeck: (d) => true,
    iap: () => null,
  },
  Onboarder: {
    days: 30,
    // entra entusiasmado, joga 7 dias, abandona
    shouldOpen: (d) => d <= 7,
    shouldPlay: (d) => d <= 7,
    shouldBuyDeck: (d) => true,
    iap: () => null,
  },
  Pagante: {
    days: 30,
    // joga 4x/semana + IAP pequeno no dia 5
    shouldOpen: (d) => ((d - 1) % 7) < 4,
    shouldPlay: (d) => ((d - 1) % 7) < 4,
    shouldBuyDeck: (d) => true,
    iap: (d) => (d === 5 ? { fichas: 100, brl: 4.90 } : null),
  },
  Whale: {
    days: 30,
    // login todo dia (preza streak) + pack maior cedo
    shouldOpen: (d) => true,
    shouldPlay: (d) => true,
    shouldBuyDeck: (d) => true,
    iap: (d) => (d === 3 ? { fichas: 800, brl: 24.90 } : null),
  },
};

function runProfile(name, profile) {
  const s = makeState();
  for (let d = 1; d <= profile.days; d++) {
    s.day = d;
    if (!profile.shouldOpen(d)) continue;
    login(s);
    const iap = profile.iap(d);
    if (iap) iapBuy(s, iap.fichas, iap.brl);
    if (profile.shouldBuyDeck(d)) tryBuyCheapest(s);
    if (profile.shouldPlay(d)) play(s, pickDeckToPlay(s));
  }
  return s;
}

// === EXECUTA TODOS OS PERFIS ===
const results = {};
for (const [name, profile] of Object.entries(PROFILES)) {
  results[name] = { profile, state: runProfile(name, profile) };
}

// === RELATORIO COMPARATIVO ===
console.log('═'.repeat(86));
console.log('  6 PERFIS DE JOGADOR — RESUMO COMPARATIVO (30 DIAS)');
console.log('═'.repeat(86));

const COLS = ['Perfect', 'Whale', 'Pagante', 'Streaky', 'Casual', 'Onboarder'];
const PAD = 10;

function row(label, getValue, fmt = v => v) {
  let line = label.padEnd(22);
  for (const name of COLS) {
    line += String(fmt(getValue(results[name].state))).padStart(PAD + 2);
  }
  console.log(line);
}

console.log('  ' + ''.padEnd(20) + COLS.map(c => c.padStart(PAD + 2)).join(''));
console.log('  ' + '─'.repeat(82));
row('Dias abertos', s => s.daysOpen);
row('Dias jogados', s => s.daysActive);
row('Total runs', s => s.totalRuns);
row('Perguntas respondidas', s => s.totalAnswered);
console.log('  ' + '─'.repeat(82));
row('Calibragem (de 7)', s => CALIBRAGEM.filter(c => s.playedDeckIds.has(c.id)).length);
row('Decks pagos (de 10)', s => s.ownedDeckIds.length);
row('% coleção total', s => {
  const total = 17; // 7 calibragem + 10 pagos
  const own = CALIBRAGEM.filter(c => s.playedDeckIds.has(c.id)).length + s.ownedDeckIds.length;
  return Math.round((own / total) * 100) + '%';
});
row('Conquistas (de 3)', s => s.achievements.size);
console.log('  ' + '─'.repeat(82));
row('Streak final', s => s.loginStreak);
row('Total ganho', s => s.totalEarned);
row('Total gasto fichas', s => s.totalSpent);
row('Saldo final', s => s.fichas);
console.log('  ' + '─'.repeat(82));
row('R$ gasto IAP', s => s.totalSpentFiat ? 'R$' + s.totalSpentFiat.toFixed(2) : '—');

console.log();
console.log('═'.repeat(86));
console.log('  LEITURA DE CADA UM');
console.log('═'.repeat(86));

const analises = {
  Perfect: 'Joga TODO DIA, abre TODO DIA — o exceção. Pega tudo que dá pra pegar grátis.',
  Whale: 'Logou todo dia + pacote R$ 24,90 cedo — fecha quase coleção inteira em 30d.',
  Pagante: 'Jogador médio que gastou R$ 4,90 — confortável, ainda tem objetivo pelo mês 2.',
  Streaky: 'Joga 5d, pula 1, repete — streak não passa de 5, perde os 50 cíclicos maiores.',
  Casual: '3x/semana, joga menos da metade dos dias — coleção avança bem devagar.',
  Onboarder: 'Veio entusiasmado, jogou 7 dias e parou — fechou calibragem e poucas pagas.',
};

for (const name of COLS) {
  const s = results[name].state;
  const calib = CALIBRAGEM.filter(c => s.playedDeckIds.has(c.id)).length;
  const pagos = s.ownedDeckIds.length;
  console.log();
  console.log(`  ${name.toUpperCase()}`);
  console.log(`    ${analises[name]}`);
  console.log(`    Resultado em 30d: ${calib}/7 calibragem + ${pagos}/10 pagos = ${calib + pagos}/17 (${Math.round((calib + pagos) / 17 * 100)}%)`);
  console.log(`    Saldo final: ${s.fichas} fichas | Conquistas: ${s.achievements.size}/3 | Streak: ${s.loginStreak}d`);
}

console.log();
