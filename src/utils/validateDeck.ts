import type { Deck } from '@/types/game';

export function validateDeck(deck: Deck): string[] {
  const errors: string[] = [];
  const validScale = new Set(['baixa', 'media', 'alta']);

  // Check required root fields
  if (!deck.category) errors.push('Missing category');
  if (!deck.difficulty) errors.push('Missing difficulty');
  if (!deck.tier || deck.tier < 1 || deck.tier > 5) errors.push('Invalid tier (must be 1-5)');

  // Distribution check
  const types = deck.questions.map(q => q.type);
  const normalCount = types.filter(t => t === 'NORMAL').length;
  const randomCount = types.filter(t => t === 'RANDOM').length;
  const socialCount = types.filter(t => t === 'SOCIAL').length;
  const tensionCount = types.filter(t => t === 'TENSION').length;

  if (normalCount !== 7) errors.push(`Expected 7 NORMAL, got ${normalCount}`);
  if (randomCount !== 1) errors.push(`Expected 1 RANDOM, got ${randomCount}`);
  if (socialCount !== 1) errors.push(`Expected 1 SOCIAL, got ${socialCount}`);
  if (tensionCount !== 1) errors.push(`Expected 1 TENSION, got ${tensionCount}`);

  for (const q of deck.questions) {
    if (q.sceneHook !== undefined && !q.sceneHook.trim()) {
      errors.push(`${q.id}: sceneHook is empty`);
    }

    if (q.options.length !== 3) {
      errors.push(`${q.id}: Expected 3 options, got ${q.options.length}`);
    }

    if (!q.metadata.pilar) {
      errors.push(`${q.id}: Missing pilar`);
    }

    if (q.metadata.proximidade && !validScale.has(q.metadata.proximidade)) {
      errors.push(`${q.id}: Invalid proximidade`);
    }

    if (q.metadata.urgencia && !validScale.has(q.metadata.urgencia)) {
      errors.push(`${q.id}: Invalid urgencia`);
    }

    for (const field of [
      'papel',
      'historico',
      'canal',
      'plateia',
      'momento',
      'intencaoDoOutro',
      'assimetria',
      'riscoPrincipal',
    ] as const) {
      const value = q.metadata[field];
      if (value !== undefined && !value.trim()) {
        errors.push(`${q.id}: ${field} is empty`);
      }
    }

    for (const opt of q.options) {
      const weights = Object.values(opt.weights);
      if (weights.length === 0) {
        errors.push(`${q.id}: Option "${opt.text.slice(0, 25)}..." has no weights`);
      }
      const hasPos = weights.some(v => v > 0);
      const hasNeg = weights.some(v => v < 0);
      if (!hasPos || !hasNeg) {
        errors.push(`${q.id}: Option "${opt.text.slice(0, 25)}..." missing trade-off (needs + and - weights)`);
      }
      if (!opt.tone) {
        errors.push(`${q.id}: Option "${opt.text.slice(0, 25)}..." missing tone`);
      }
    }
  }

  return errors;
}
