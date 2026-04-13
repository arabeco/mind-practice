import type { Deck } from '@/types/game';

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateDeck(deck: Deck): string[] {
  const errors: string[] = [];
  const validScale = new Set(['baixa', 'media', 'alta']);

  // Check required root fields
  if (!deck.category) errors.push('Missing category');
  if (!deck.difficulty) errors.push('Missing difficulty');
  if (!deck.tier || deck.tier < 1 || deck.tier > 5) errors.push('Invalid tier (must be 1-5)');

  // Question count check
  if (deck.questions.length < 5 || deck.questions.length > 10) {
    errors.push(`Expected 5-10 questions, got ${deck.questions.length}`);
  }

  for (const q of deck.questions) {
    if (q.sceneHook !== undefined && !q.sceneHook.trim()) {
      errors.push(`${q.id}: sceneHook is empty`);
    }

    if (q.options.length < 3 || q.options.length > 5) {
      errors.push(`${q.id}: Expected 3-5 options, got ${q.options.length}`);
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

    // Slide text length checks
    for (const slide of q.slides) {
      const wc = wordCount(slide.texto);
      if (slide.tipo === 'contexto' && wc > 25) {
        errors.push(`${q.id}: Context slide has ${wc} words (max 25)`);
      }
      if (slide.tipo === 'evento' && wc > 20) {
        errors.push(`${q.id}: Event slide has ${wc} words (max 20)`);
      }
    }

    // Option/feedback text length checks
    for (const opt of q.options) {
      const textWc = wordCount(opt.text);
      if (textWc > 15) {
        errors.push(`${q.id}: Option "${opt.text.slice(0, 25)}..." has ${textWc} words (max 15)`);
      }
      const fbWc = wordCount(opt.feedback);
      if (fbWc > 15) {
        errors.push(`${q.id}: Feedback "${opt.feedback.slice(0, 25)}..." has ${fbWc} words (max 15)`);
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
