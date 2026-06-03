/**
 * Otimiza os avatares: a<N>.png / b<N>.png (941x1672, ~2MB cada) →
 * WebP 640px q82 (~120KB). Remove os PNGs originais e a pasta legada
 * archetypes/ (fallback morto — o set a/b cobre os 15 arquétipos × 2).
 *
 * Rodar uma vez: node scripts/optimize-avatars.mjs
 */
import sharp from 'sharp';
import { readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'public/avatars';
const LEGACY = join(DIR, 'archetypes');

const before = [];
const files = readdirSync(DIR).filter(f => /^(a|b)\d+\.png$/.test(f));
let savedKb = 0;

for (const f of files) {
  const src = join(DIR, f);
  const out = join(DIR, f.replace(/\.png$/, '.webp'));
  const origKb = Math.round(statSync(src).size / 1024);
  await sharp(src).resize({ width: 640 }).webp({ quality: 82 }).toFile(out);
  const newKb = Math.round(statSync(out).size / 1024);
  rmSync(src);
  savedKb += origKb - newKb;
  before.push(`${f} ${origKb}KB → ${newKb}KB`);
}

console.log(`Convertidos ${files.length} avatares a/b → webp:`);
before.slice(0, 4).forEach(l => console.log('  ' + l));
console.log('  ...');

// Remove o set legado inteiro (peso morto — só era fallback)
try {
  rmSync(LEGACY, { recursive: true, force: true });
  console.log('Pasta legada archetypes/ removida.');
} catch {}

console.log(`\nEconomia (só a/b): ~${Math.round(savedKb / 1024)} MB + legado ~34 MB`);
