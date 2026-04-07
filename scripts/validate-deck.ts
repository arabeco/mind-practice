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

const VALID_QUESTION_TYPES = ["NORMAL", "RANDOM", "SOCIAL", "TENSION"] as const;
type QuestionType = (typeof VALID_QUESTION_TYPES)[number];

const REQUIRED_TYPE_COUNTS: Record<QuestionType, number> = {
  NORMAL: 7,
  RANDOM: 1,
  SOCIAL: 1,
  TENSION: 1,
};

const VALID_PROXIMIDADE = ["baixa", "media", "alta"];
const VALID_URGENCIA = ["baixa", "media", "alta"];

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
    if (typeof deck.tier !== "number" || deck.tier < 1 || deck.tier > 5) {
      err(`tier must be a number between 1 and 5 (got ${deck.tier})`);
    }
  }

  // 2. Questions array
  const questions: any[] = deck.questions;
  if (!Array.isArray(questions)) {
    err(`"questions" must be an array`);
    return result;
  }
  if (questions.length !== 10) {
    err(`Expected 10 questions, found ${questions.length}`);
  }

  // Type distribution
  const typeCounts: Record<string, number> = {};
  for (const q of questions) {
    const t = q.type ?? "UNKNOWN";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  for (const [type, expected] of Object.entries(REQUIRED_TYPE_COUNTS)) {
    const actual = typeCounts[type] || 0;
    if (actual !== expected) {
      err(`Expected ${expected} ${type} question(s), found ${actual}`);
    }
  }

  // Track axes that appear as dominant across the whole deck (for warning 8)
  const dominantAxes = new Set<string>();

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

      // 4b. Weights: at least one positive AND one negative
      const weights: Record<string, number> = opt.weights ?? {};
      const vals = Object.values(weights) as number[];
      const hasPositive = vals.some((v) => v > 0);
      const hasNegative = vals.some((v) => v < 0);
      if (!hasPositive || !hasNegative) {
        err(`${oLabel}: weights must have at least one positive AND one negative value`);
      }

      // 7. Weight sum warning
      const sum = vals.reduce((a, b) => a + b, 0);
      if (Math.abs(sum) > 3) {
        warn(`${oLabel}: weight sum is ${sum} (abs > 3)`);
      }

      // Track dominant axis (highest absolute weight)
      let maxAbs = 0;
      let dominant = "";
      for (const [axis, val] of Object.entries(weights)) {
        if (Math.abs(val as number) > maxAbs) {
          maxAbs = Math.abs(val as number);
          dominant = axis;
        }
      }
      if (dominant) dominantAxes.add(dominant);
    });
  });

  // 8. Axis coverage warning
  for (const axis of VALID_AXES) {
    if (!dominantAxes.has(axis)) {
      warn(`Axis "${axis}" never appears as the dominant weight in any option`);
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
