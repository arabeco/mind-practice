#!/usr/bin/env tsx
/**
 * Retag one-shot: para cada Option em src/data/decks/*.json, sugere
 * (intent, baseWeights) via heurística sobre (tone, weights), grava
 * in-place (mantendo `weights` legado), imprime diff resumido.
 *
 * Uso:
 *   npx tsx scripts/retag-options.ts             # todos os decks, sobrescreve
 *   npx tsx scripts/retag-options.ts --dry       # só imprime, não grava
 */

import * as fs from 'fs';
import * as path from 'path';

type Axis = 'vigor' | 'harmonia' | 'filtro' | 'presenca' | 'desapego';
type Tone = 'pragmatico' | 'provocativo' | 'protetor' | 'evasivo' | 'neutro';
type Intent =
  | 'confronto_publico' | 'confronto_privado' | 'retirada'
  | 'adesao' | 'contra_movimento' | 'investigacao'
  | 'provocacao' | 'protecao';

interface RawOption {
  text: string;
  subtext: string;
  tone: Tone;
  weights?: Partial<Record<Axis, number>>;
  intent?: Intent;
  baseWeights?: Partial<Record<Axis, number>>;
  [k: string]: unknown;
}

const DECKS_DIR = path.resolve(process.cwd(), 'src/data/decks');
const DRY = process.argv.includes('--dry');

function strongest(weights: Partial<Record<Axis, number>>): { axis: Axis | null; value: number } {
  let axis: Axis | null = null;
  let best = 0;
  for (const [a, v] of Object.entries(weights) as Array<[Axis, number]>) {
    if (v > best) { axis = a; best = v; }
  }
  return { axis, value: best };
}

function weight(w: Partial<Record<Axis, number>>, axis: Axis): number {
  return w[axis] ?? 0;
}

/**
 * Heurística de sugestão de intent.
 * Documentada na tabela do spec: (tone × eixo dominante × magnitude) → intent.
 */
function suggestIntent(tone: Tone, w: Partial<Record<Axis, number>>): Intent {
  const { axis, value } = strongest(w);

  if (tone === 'provocativo') {
    return (axis === 'vigor' && value >= 2) ? 'confronto_publico' : 'provocacao';
  }
  if (tone === 'pragmatico') {
    if (axis === 'vigor' && value >= 2 && weight(w, 'filtro') >= 1) return 'confronto_privado';
    if (axis === 'filtro' && value >= 2) return 'investigacao';
    if (axis === 'desapego' && value >= 2) return 'retirada';
    return 'confronto_privado';
  }
  if (tone === 'protetor') {
    if (axis === 'filtro' || (axis === 'harmonia' && value >= 2)) return 'protecao';
    return 'protecao';
  }
  if (tone === 'evasivo') {
    if (axis === 'desapego' && value >= 1) return 'retirada';
    return 'contra_movimento';
  }
  if (tone === 'neutro') {
    if (axis === 'harmonia' && value >= 2) return 'adesao';
    if (axis === 'filtro' && value >= 1) return 'investigacao';
    if (axis === 'presenca' && value >= 1) return 'adesao';
    return 'adesao';
  }
  return 'contra_movimento';
}

/** baseWeights sugerido: cada valor de weights dividido por 2, arredondado; zeros omitidos. */
function suggestBase(w: Partial<Record<Axis, number>>): Partial<Record<Axis, number>> {
  const base: Partial<Record<Axis, number>> = {};
  for (const [axis, v] of Object.entries(w) as Array<[Axis, number]>) {
    const halved = Math.round(v / 2);
    if (halved !== 0) base[axis] = halved;
  }
  // Garante "pelo menos um positivo E um negativo" — o validator exige.
  // Se tudo ficou zero ou do mesmo sinal, tenta fallback preservando sinais:
  const vals = Object.values(base) as number[];
  const hasPos = vals.some((v) => v > 0);
  const hasNeg = vals.some((v) => v < 0);
  if (!hasPos || !hasNeg) {
    // Fallback: pega os extremos do weights original.
    let maxAxis: Axis | null = null, minAxis: Axis | null = null;
    let maxV = -Infinity, minV = Infinity;
    for (const [a, v] of Object.entries(w) as Array<[Axis, number]>) {
      if (v > maxV) { maxV = v; maxAxis = a; }
      if (v < minV) { minV = v; minAxis = a; }
    }
    base[maxAxis as Axis] = 1;
    base[minAxis as Axis] = -1;
  }
  return base;
}

function processFile(filePath: string): { changed: boolean; diffs: string[] } {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const diffs: string[] = [];
  const deckId = raw.deckId ?? path.basename(filePath, '.json');

  for (const q of raw.questions ?? []) {
    for (let i = 0; i < (q.options ?? []).length; i++) {
      const opt: RawOption = q.options[i];
      if (opt.intent && opt.baseWeights) continue; // Já retaggeado
      if (!opt.weights) continue;                  // Sem weights nem base — skip

      const intent = suggestIntent(opt.tone, opt.weights);
      const base = suggestBase(opt.weights);

      opt.intent = intent;
      opt.baseWeights = base;

      diffs.push(`${deckId} › ${q.id} › Opt${i + 1}: intent=${intent}, base=${JSON.stringify(base)} (de weights=${JSON.stringify(opt.weights)})`);
    }
  }

  if (!DRY && diffs.length > 0) {
    fs.writeFileSync(filePath, JSON.stringify(raw, null, 2) + '\n', 'utf-8');
  }
  return { changed: diffs.length > 0, diffs };
}

function main() {
  const files = fs.readdirSync(DECKS_DIR).filter((f) => f.endsWith('.json'));
  let total = 0;
  for (const f of files) {
    const full = path.join(DECKS_DIR, f);
    const { changed, diffs } = processFile(full);
    if (changed) {
      console.log(`\n--- ${f} (${diffs.length} options retaggeadas) ---`);
      for (const d of diffs) console.log('  ' + d);
      total += diffs.length;
    }
  }
  console.log(`\n${DRY ? '[dry] ' : ''}Total: ${total} options retaggeadas em ${files.length} decks.`);
}

main();
