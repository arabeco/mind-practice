#!/usr/bin/env tsx
/**
 * CLI Deck Validator
 * Usage:
 *   npx tsx scripts/validate-deck.ts              # validate all decks
 *   npx tsx scripts/validate-deck.ts path/to.json  # validate one file
 */

import * as fs from "fs";
import * as path from "path";

// ── Colorized output helpers ──────────────────────────────────────────
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

// ── Inlined types ─────────────────────────────────────────────────────
const VALID_AXES = ["vigor", "presenca", "harmonia", "desapego", "filtro"] as const;
type Axis = (typeof VALID_AXES)[number];

const VALID_PROXIMIDADE = ["baixa", "media", "alta"];
const VALID_URGENCIA = ["baixa", "media", "alta"];
const VALID_RARITIES = ["comum", "raro", "epico", "lendario", "campanha"] as const;

const VALID_STATS = ["vigor", "harmonia", "filtro", "presenca", "desapego"] as const;

// ── Helpers ───────────────────────────────────────────────────────────
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

interface ValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
}

// ── Validation ────────────────────────────────────────────────────────
function validateDeck(filePath: string): ValidationResult {
  const result: ValidationResult = { file: filePath, errors: [], warnings: [] };
  const err = (msg: string) => result.errors.push(msg);
  const warn = (msg: string) => result.warnings.push(msg);

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    err(`Could not read file`);
    return result;
  }

  let deck: any;
  try {
    deck = JSON.parse(raw);
  } catch {
    err(`Invalid JSON`);
    return result;
  }

  // 1. Root fields
  for (const field of ["deckId", "name", "category", "difficulty"]) {
    if (deck[field] === undefined || deck[field] === null || deck[field] === "") {
      err(`Missing required root field: ${field}`);
    }
  }
  if (deck.tier !== undefined) {
    if (typeof deck.tier !== "number" || deck.tier < 1 || deck.tier > 6) {
      err(`tier must be a number between 1 and 6 (got ${deck.tier})`);
    }
  }

  // Rarity validation
  if (!(VALID_RARITIES as readonly string[]).includes(deck.rarity)) {
    err(`rarity obrigatorio e deve ser um de: ${VALID_RARITIES.join(', ')}`);
  }

  // SeasonId validation
  if (typeof deck.seasonId !== "string" || !deck.seasonId.startsWith("season-")) {
    err(`seasonId obrigatorio e deve começar com 'season-' (ex: 'season-0')`);
  }

  // PriceFichas validation
  if (deck.priceFichas !== null && (typeof deck.priceFichas !== "number" || deck.priceFichas < 0)) {
    err(`priceFichas deve ser null ou numero >= 0`);
  }

  // 2. Questions array
  const questions: any[] = deck.questions;
  if (!Array.isArray(questions)) {
    err(`"questions" must be an array`);
    return result;
  }
  if (questions.length < 5 || questions.length > 10) {
    err(`Expected 5-10 questions, found ${questions.length}`);
  }

  // Track axes that appear as dominant across the whole deck (for warning 8)
  const dominantAxes = new Set<string>();
  const axisAppearances: Record<string, number> = {};

  // Per-question validation
  questions.forEach((q, qi) => {
    const qLabel = `Q${qi + 1} (${q.id ?? "no id"})`;

    // 6. Metadata
    if (!q.metadata?.pilar) {
      err(`${qLabel}: metadata.pilar is required`);
    }
    if (q.metadata?.proximidade && !VALID_PROXIMIDADE.includes(q.metadata.proximidade)) {
      err(`${qLabel}: metadata.proximidade must be baixa/media/alta (got "${q.metadata.proximidade}")`);
    }
    if (q.metadata?.urgencia && !VALID_URGENCIA.includes(q.metadata.urgencia)) {
      err(`${qLabel}: metadata.urgencia must be baixa/media/alta (got "${q.metadata.urgencia}")`);
    }

    // Slides word counts (rule 5)
    if (Array.isArray(q.slides)) {
      for (const slide of q.slides) {
        const wc = wordCount(slide.texto ?? "");
        if (slide.tipo === "contexto" && wc > 25) {
          err(`${qLabel}: context slide has ${wc} words (max 25)`);
        }
        if (slide.tipo === "evento" && wc > 20) {
          err(`${qLabel}: event slide has ${wc} words (max 20)`);
        }
      }
    }

    // 3. Options count
    const options: any[] = q.options;
    if (!Array.isArray(options)) {
      err(`${qLabel}: "options" must be an array`);
      return;
    }
    if (options.length < 3 || options.length > 5) {
      err(`${qLabel}: expected 3-5 options, found ${options.length}`);
    }

    // Per-option validation
    options.forEach((opt, oi) => {
      const oLabel = `${qLabel} > Opt${oi + 1}`;

      // 4a. Tone required
      if (!opt.tone) {
        err(`${oLabel}: missing "tone"`);
      }

      // 5. Word counts
      const optTextWc = wordCount(opt.text ?? "");
      if (optTextWc > 15) {
        err(`${oLabel}: option text has ${optTextWc} words (max 15)`);
      }
      const feedbackWc = wordCount(opt.feedback ?? "");
      if (feedbackWc > 15) {
        err(`${oLabel}: feedback has ${feedbackWc} words (max 15)`);
      }

      // 4b. Evidence é o único formato suportado pós-Fase 4.
      const hasEvidence = opt.evidence && typeof opt.evidence === 'object';
      if (!hasEvidence) {
        err(`${oLabel}: Option precisa de campo "evidence"`);
      } else {
        const axes = Object.keys(opt.evidence);
        if (axes.length < 1 || axes.length > 3) {
          err(`${oLabel}: evidence deve declarar entre 1 e 3 eixos (tem ${axes.length})`);
        }
        let hasMin = false;
        let hasMax = false;
        let dominant = "";
        let dominantConf = 0;
        for (const [axis, ax] of Object.entries(opt.evidence as Record<string, any>)) {
          if (!(VALID_STATS as readonly string[]).includes(axis)) {
            err(`${oLabel}: evidence.${axis} — eixo invalido`);
            continue;
          }
          if (typeof ax.confidence !== 'number' || ax.confidence < 0.5 || ax.confidence > 0.99) {
            err(`${oLabel}: evidence.${axis}.confidence deve estar em [0.5, 0.99] (got ${ax.confidence})`);
          }
          const hasMinField = typeof ax.min === 'number';
          const hasMaxField = typeof ax.max === 'number';
          if (!hasMinField && !hasMaxField) {
            err(`${oLabel}: evidence.${axis} precisa de min ou max`);
          }
          if (hasMinField && (ax.min < 0 || ax.min > 1)) {
            err(`${oLabel}: evidence.${axis}.min deve estar em [0,1] (got ${ax.min})`);
          }
          if (hasMaxField && (ax.max < 0 || ax.max > 1)) {
            err(`${oLabel}: evidence.${axis}.max deve estar em [0,1] (got ${ax.max})`);
          }
          if (hasMinField && hasMaxField && ax.min > ax.max) {
            err(`${oLabel}: evidence.${axis}: min (${ax.min}) > max (${ax.max})`);
          }
          if (hasMinField) hasMin = true;
          if (hasMaxField) hasMax = true;

          // Eixo dominante: maior confidence (empate → primeiro listado).
          const c = typeof ax.confidence === 'number' ? ax.confidence : 0;
          if (c > dominantConf) {
            dominantConf = c;
            dominant = axis;
          }
          axisAppearances[axis] = (axisAppearances[axis] || 0) + 1;
        }
        if (axes.length >= 2 && !(hasMin && hasMax)) {
          warn(`${oLabel}: evidence sem trade-off (só min ou só max em todos os eixos)`);
        }
        if (dominant) dominantAxes.add(dominant);
      }
    });
  });

  // 8. Axis coverage warning
  for (const axis of VALID_AXES) {
    if (!dominantAxes.has(axis)) {
      warn(`Axis "${axis}" never appears as the dominant evidence in any option`);
    }
  }

  if (deck.category === 'calibragem') {
    const totalOptions = questions.reduce((sum: number, q: any) => sum + q.options.length, 0);
    const minPerAxis = Math.ceil(totalOptions * 0.2);
    for (const [axis, count] of Object.entries(axisAppearances)) {
      if (count < minPerAxis) {
        warn(`Calibragem: axis "${axis}" is dominant in ${count}/${totalOptions} options (need ${minPerAxis} for 20%)`);
      }
    }
  }

  // Training deck: 60% das options precisam declarar evidência no trainingTarget
  if (deck.isTraining === true) {
    if (!deck.trainingTarget || !(VALID_STATS as readonly string[]).includes(deck.trainingTarget)) {
      err(`isTraining=true requer trainingTarget valido (vigor|harmonia|filtro|presenca|desapego)`);
    } else {
      let totalOptions = 0;
      let targeted = 0;
      for (const q of questions) {
        for (const opt of q.options ?? []) {
          totalOptions += 1;
          if (opt.evidence && (opt.evidence as any)[deck.trainingTarget]) targeted += 1;
        }
      }
      const ratio = totalOptions > 0 ? targeted / totalOptions : 0;
      if (ratio < 0.6) {
        err(`Training deck deve ter >=60% options com evidence em "${deck.trainingTarget}" (got ${(ratio * 100).toFixed(0)}%)`);
      }
    }
  }

  return result;
}

// ── CLI entry point ───────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  let files: string[];

  if (args.length > 0) {
    files = [path.resolve(args[0])];
  } else {
    const decksDir = path.resolve(__dirname, "..", "src", "data", "decks");
    if (!fs.existsSync(decksDir)) {
      console.error(red(`Decks directory not found: ${decksDir}`));
      process.exit(1);
    }
    files = fs
      .readdirSync(decksDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(decksDir, f));
  }

  if (files.length === 0) {
    console.log(yellow("No deck files found."));
    process.exit(0);
  }

  console.log(bold(`\nValidating ${files.length} deck file(s)...\n`));

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of files) {
    const result = validateDeck(file);
    const label = path.basename(file);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log(green(`  ✓ ${label}`));
    } else {
      if (result.errors.length > 0) {
        console.log(red(`  ✗ ${label}`));
        for (const e of result.errors) {
          console.log(red(`      ✗ ${e}`));
        }
      } else {
        console.log(green(`  ✓ ${label}`) + yellow(` (${result.warnings.length} warning(s))`));
      }
      for (const w of result.warnings) {
        console.log(yellow(`      ⚠ ${w}`));
      }
    }
  }

  console.log("");
  console.log(bold("Summary:"));
  console.log(`  Errors:   ${totalErrors > 0 ? red(String(totalErrors)) : green("0")}`);
  console.log(`  Warnings: ${totalWarnings > 0 ? yellow(String(totalWarnings)) : green("0")}`);
  console.log("");

  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
