#!/usr/bin/env tsx
/**
 * Strip legacy `weights` field from all deck JSONs (Fase 4 — Task 21 tail).
 *
 * Idempotente: roda quantas vezes quiser, nada acontece se já tiver sido
 * limpo. Após rodar, `npm run deck:validate` passa exigindo `evidence`.
 */
import * as fs from 'fs';
import * as path from 'path';

const decksDir = path.resolve(process.cwd(), 'src', 'data', 'decks');
let touched = 0;
let totalRemoved = 0;

for (const f of fs.readdirSync(decksDir).filter(f => f.endsWith('.json'))) {
  const p = path.join(decksDir, f);
  const deck = JSON.parse(fs.readFileSync(p, 'utf-8'));
  let removed = 0;
  for (const q of deck.questions ?? []) {
    for (const opt of q.options ?? []) {
      if (opt.weights !== undefined) {
        delete opt.weights;
        removed++;
      }
    }
  }
  if (removed > 0) {
    fs.writeFileSync(p, JSON.stringify(deck, null, 2) + '\n', 'utf-8');
    console.log(`  ${f}: removed weights from ${removed} options`);
    touched++;
    totalRemoved += removed;
  }
}

console.log(`\nDone. ${touched} decks touched, ${totalRemoved} weights fields removed.`);
