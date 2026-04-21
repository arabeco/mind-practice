#!/usr/bin/env tsx
/**
 * Migra decks: cada Option com `baseWeights` (ou `weights` legacy) ganha
 * campo `evidence` equivalente. NÃO remove `baseWeights`/`weights` — esse
 * passo é feito em Task 20 após passagem de IA e validação.
 */
import * as fs from 'fs';
import * as path from 'path';

type AxisEvidence = { min?: number; max?: number; confidence: number };
type OptionEvidence = Record<string, AxisEvidence>;

function weightToEvidence(w: number): AxisEvidence {
  if (w >= 3)  return { min: 0.75, confidence: 0.80 };
  if (w === 2) return { min: 0.60, confidence: 0.75 };
  if (w === 1) return { min: 0.55, confidence: 0.60 };
  if (w === -1) return { max: 0.45, confidence: 0.60 };
  if (w === -2) return { max: 0.40, confidence: 0.75 };
  return { max: 0.25, confidence: 0.80 };
}

function buildEvidence(weights: Record<string, number>): OptionEvidence {
  const entries = Object.entries(weights).filter(([, v]) => v !== 0);
  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const top3 = entries.slice(0, 3);
  const out: OptionEvidence = {};
  for (const [axis, v] of top3) out[axis] = weightToEvidence(v);
  return out;
}

function migrateOption(opt: any): boolean {
  if (opt.evidence) return false;
  const src = opt.baseWeights ?? opt.weights;
  if (!src || typeof src !== 'object') return false;
  opt.evidence = buildEvidence(src);
  return true;
}

function migrateDeckFile(filePath: string): number {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const deck = JSON.parse(raw);
  let count = 0;
  for (const q of deck.questions ?? []) {
    for (const opt of q.options ?? []) {
      if (migrateOption(opt)) count += 1;
    }
  }
  if (count > 0) {
    fs.writeFileSync(filePath, JSON.stringify(deck, null, 2) + '\n', 'utf-8');
  }
  return count;
}

function main() {
  const decksDir = path.resolve(__dirname, '..', 'src', 'data', 'decks');
  const files = fs
    .readdirSync(decksDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(decksDir, f));

  let totalOptions = 0;
  let totalFiles = 0;
  for (const file of files) {
    const n = migrateDeckFile(file);
    if (n > 0) {
      totalFiles += 1;
      totalOptions += n;
      console.log(`  ${path.basename(file)}: ${n} options migrated`);
    }
  }
  console.log(`\nDone: ${totalOptions} options across ${totalFiles} decks`);
}

main();
