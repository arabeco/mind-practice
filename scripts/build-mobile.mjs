#!/usr/bin/env node
/**
 * Mobile build wrapper.
 *
 * Static export do Next.js (`output: 'export'`) não suporta:
 *   - Rotas /api/*  (server-only)
 *   - Rotas dinâmicas sem `generateStaticParams` (ex: /r/[code])
 *
 * Web build usa essas rotas (waitlist, og, admin, referrals, /r).
 * Mobile build não precisa delas — a app fala direto com Supabase.
 *
 * Estratégia: renomeia src/app/api → _api_hidden e src/app/r → _r_hidden
 * ANTES do build mobile, e RESTAURA depois (mesmo se o build falhar).
 *
 * Roda via: `npm run build:mobile`
 */
import { spawnSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

const HIDES = [
  {
    visible: join(ROOT, 'src', 'app', 'api'),
    hidden: join(ROOT, 'src', 'app', '_api_hidden_for_mobile'),
  },
  {
    visible: join(ROOT, 'src', 'app', 'r'),
    hidden: join(ROOT, 'src', 'app', '_r_hidden_for_mobile'),
  },
];

function hide(entry) {
  if (existsSync(entry.visible)) {
    renameSync(entry.visible, entry.hidden);
    return true;
  }
  return false;
}

function restore(entry) {
  if (existsSync(entry.hidden)) {
    renameSync(entry.hidden, entry.visible);
  }
}

const hidden = HIDES.map(h => ({ entry: h, was: hide(h) }));
let exitCode = 1;
try {
  const result = spawnSync(
    'npx',
    ['cross-env', 'MOBILE_BUILD=1', 'next', 'build'],
    { stdio: 'inherit', shell: true },
  );
  exitCode = result.status ?? 1;
} finally {
  for (const { entry, was } of hidden) {
    if (was) restore(entry);
  }
}
process.exit(exitCode);
