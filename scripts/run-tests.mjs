#!/usr/bin/env node
/**
 * Cross-platform test runner: glob `src/**\/*.test.ts` e dispara
 * `node --test --import tsx`. Existe porque node --test nao expande
 * globs em Windows e nao recursa diretorios por default.
 */
import { globSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = globSync('src/**/*.test.ts');
if (files.length === 0) {
  console.error('Nenhum *.test.ts encontrado em src/');
  process.exit(1);
}

const result = spawnSync(
  'node',
  ['--test', '--import', 'tsx', ...files],
  { stdio: 'inherit', shell: false },
);
process.exit(result.status ?? 1);
