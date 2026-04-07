import type { Question } from '@/types/game';

const FALLBACK_CHIP_LIMIT = 3;
const PRIMARY_CHIP_LIMIT = 5;

export function getSceneContextChips(question: Question): string[] {
  const { metadata } = question;
  const primary = [
    metadata.papel,
    metadata.proximidade ? `${metadata.proximidade} proximidade` : undefined,
    metadata.canal,
    metadata.plateia,
    metadata.riscoPrincipal ? `risco: ${metadata.riscoPrincipal}` : undefined,
    metadata.intencaoDoOutro ? `subtexto: ${metadata.intencaoDoOutro}` : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .slice(0, PRIMARY_CHIP_LIMIT);

  if (primary.length > 0) {
    return primary.map(formatChipLabel);
  }

  return [
    question.metadata.ambiente,
    question.metadata.relacao,
    question.metadata.aposta,
  ]
    .slice(0, FALLBACK_CHIP_LIMIT)
    .map(formatChipLabel);
}

export function getSceneSupportLine(
  question: Question,
  phase: 'context' | 'event',
): string | null {
  if (phase === 'context') {
    return question.metadata.historico?.trim() || null;
  }

  if (question.sceneHook?.trim()) {
    return question.sceneHook.trim();
  }

  if (question.metadata.intencaoDoOutro?.trim()) {
    return `No ar: ${formatInlineLabel(question.metadata.intencaoDoOutro)}`;
  }

  return null;
}

function formatChipLabel(value: string): string {
  const normalized = formatInlineLabel(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatInlineLabel(value: string): string {
  return value.replace(/_/g, ' ').trim();
}
