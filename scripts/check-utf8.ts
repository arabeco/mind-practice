#!/usr/bin/env tsx
/**
 * UTF-8 lint — falha se encontrar substituições ASCII conhecidas
 * em strings de UI. Roda em `*.tsx` de src/ e `*.json` em src/data/decks/.
 */
import { readFileSync, globSync } from 'node:fs';

interface Rule {
  bad: RegExp;       // padrão ASCII a procurar
  good: string;      // sugestão correta
  description: string;
}

const RULES: Rule[] = [
  { bad: /\bArquetipo\b/g,   good: 'Arquétipo',  description: 'acento agudo em é' },
  { bad: /\bArquetipos\b/g,  good: 'Arquétipos', description: 'plural' },
  { bad: /\bCalibracao\b/g,  good: 'Calibração', description: 'til em ã + cedilha' },
  { bad: /\bDirecao\b/g,     good: 'Direção',    description: 'til em ã + cedilha' },
  { bad: /\bDecisao\b/g,     good: 'Decisão',    description: 'til em ã' },
  { bad: /\bReflexao\b/g,    good: 'Reflexão',   description: 'til em ã' },
  { bad: /\bAtencao\b/g,     good: 'Atenção',    description: 'til em ã + cedilha' },
  { bad: /\bIntencao\b/g,    good: 'Intenção',   description: 'til em ã + cedilha' },
  { bad: /\bEstavel\b/g,     good: 'Estável',    description: 'acento agudo' },
  { bad: /\bInstavel\b/g,    good: 'Instável',   description: 'acento agudo' },
  { bad: /\bVoce\b/g,        good: 'Você',       description: 'cedilha + acento' },
  { bad: /\bvoce\b/g,        good: 'você',       description: 'cedilha + acento' },
  { bad: /\bnao\b/g,         good: 'não',        description: 'til em ã' },
  { bad: /\bNao\b/g,         good: 'Não',        description: 'til em ã' },
  { bad: /\bja\b/g,          good: 'já',         description: 'acento agudo' },
  { bad: /\bate\b/g,         good: 'até',        description: 'acento agudo' },
  { bad: /\bMascara\b/g,     good: 'Máscara',    description: 'acento agudo' },
];

interface Violation {
  file: string;
  line: number;
  rule: Rule;
  match: string;
}

const violations: Violation[] = [];

const files = [
  ...globSync('src/**/*.tsx'),
  ...globSync('src/data/decks/*.json'),
];

for (const file of files) {
  const text = readFileSync(file, 'utf-8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      const m = line.match(rule.bad);
      if (m) {
        violations.push({ file, line: i + 1, rule, match: m[0] });
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\n❌ ${violations.length} violação(ões) UTF-8 encontradas:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  "${v.match}" → "${v.rule.good}"  (${v.rule.description})`);
  }
  process.exit(1);
}

console.log('✅ UTF-8 check OK — nenhuma substituição ASCII conhecida.');
