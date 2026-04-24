#!/usr/bin/env tsx
/**
 * Golden test manual: compara axes computados pelo pipeline legado (weights fixo)
 * vs pipeline novo (baseWeights + CONTEXT_MODIFIERS) em 10 cenas fixas.
 *
 * Reporte somente — não falha. Autor revisa e decide se o delta é aceitável.
 *
 * Uso: npx tsx scripts/compare-engine-golden.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveWeights } from '@/lib/narrativeEngine';
import type { Option, SceneMetadata, StatKey } from '@/types/game';

const DECKS_DIR = path.resolve(process.cwd(), 'src/data/decks');

interface Fixture {
  deckId: string;
  questionId: string;
  optionIndex: number;
  responseTimeMs: number;
}

const FIXTURES: Fixture[] = [
  { deckId: 'alta_tensao',       questionId: 'at1', optionIndex: 0, responseTimeMs: 4000 },
  { deckId: 'alta_tensao',       questionId: 'at2', optionIndex: 0, responseTimeMs: 5500 },
  { deckId: 'profissional',      questionId: 'pr1', optionIndex: 0, responseTimeMs: 3000 },
  { deckId: 'profissional',      questionId: 'pr2', optionIndex: 1, responseTimeMs: 7000 },
  { deckId: 'social',            questionId: 'so1', optionIndex: 0, responseTimeMs: 4500 },
  { deckId: 'social',            questionId: 'so2', optionIndex: 2, responseTimeMs: 6500 },
  { deckId: 'holofote',          questionId: 'ho1', optionIndex: 0, responseTimeMs: 3800 },
  { deckId: 'holofote',          questionId: 'ho2', optionIndex: 1, responseTimeMs: 8000 },
  { deckId: 'livro_amaldicoado', questionId: 'la1', optionIndex: 0, responseTimeMs: 5000 },
  { deckId: 'livro_amaldicoado', questionId: 'la2', optionIndex: 1, responseTimeMs: 4200 },
];

const AXES: StatKey[] = ['vigor', 'harmonia', 'filtro', 'presenca', 'desapego'];

function loadDeck(deckId: string): any {
  return JSON.parse(fs.readFileSync(path.join(DECKS_DIR, `${deckId}.json`), 'utf-8'));
}

function zeros(): Record<StatKey, number> {
  return { vigor: 0, harmonia: 0, filtro: 0, presenca: 0, desapego: 0 };
}

function main() {
  const legacySum = zeros();
  const newSum = zeros();

  console.log('Fixture-by-fixture:\n');
  console.log('deck/qid/opt           | legacy weights           | new finalWeights         | delta');
  console.log('-'.repeat(110));

  for (const f of FIXTURES) {
    const deck = loadDeck(f.deckId);
    const question = (deck.questions as any[]).find((q) => q.id === f.questionId);
    if (!question) { console.warn(`Pulou: ${f.deckId}/${f.questionId} nao encontrado`); continue; }
    const option = question.options[f.optionIndex] as Option;
    if (!option) { console.warn(`Pulou: ${f.deckId}/${f.questionId}/opt${f.optionIndex}`); continue; }
    const meta = question.metadata as SceneMetadata;

    const legacy = option.weights ?? {};
    const resolved = resolveWeights(option, meta, f.responseTimeMs);

    const deltaStr = AXES.map((a) => {
      const L = legacy[a] ?? 0;
      const N = resolved.finalWeights[a] ?? 0;
      legacySum[a] += L;
      newSum[a] += N;
      return `${a[0]}:${N - L >= 0 ? '+' : ''}${N - L}`;
    }).join(' ');

    console.log(
      `${f.deckId.padEnd(18)} ${f.questionId}/${f.optionIndex} | ${JSON.stringify(legacy).padEnd(24)} | ${JSON.stringify(resolved.finalWeights).padEnd(24)} | ${deltaStr}`,
    );
  }

  console.log('\nSoma total (10 fixtures):');
  console.log('axis      | legacy | new   | delta');
  console.log('-'.repeat(40));
  for (const a of AXES) {
    console.log(`${a.padEnd(9)} | ${String(legacySum[a]).padStart(6)} | ${String(newSum[a]).padStart(5)} | ${(newSum[a] - legacySum[a] >= 0 ? '+' : '')}${newSum[a] - legacySum[a]}`);
  }

  console.log('\nCriterio de sanidade:');
  console.log('  - Vigor total deve cair ou se manter vs legacy.');
  console.log('  - Harmonia/filtro/presenca/desapego podem subir (compensa vigor saturado).');
  console.log('  - Nenhum eixo deve se mover >3x o legacy em magnitude absoluta.');
}

main();
