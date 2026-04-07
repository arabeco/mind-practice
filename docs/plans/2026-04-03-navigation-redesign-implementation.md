# Navigation Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign app navigation from 3 tabs to 5 tabs (Home, Dashboard, Decks, Loja, Perfil) with dedicated pages for each section.

**Architecture:** Update BottomNav to 5 tabs with center-highlighted Decks tab. Split current `/config` page into `/dashboard` (stats/runs) and `/perfil` (identity/settings). Create new `/loja` placeholder. Redesign Home with suggestions and `/decks` with selection slot. No changes to game engine, play flow, or resultado pages.

**Tech Stack:** Next.js 16, React 19, TypeScript, Framer Motion, Tailwind CSS

---

### Task 1: Redesign BottomNav to 5 tabs

**Files:**
- Modify: `src/components/BottomNav.tsx`

**Step 1: Replace the entire BottomNav component**

The current nav has 3 tabs (Home, Desafio, Config). Replace with 5 tabs where Decks (center) gets special visual treatment.

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const tabs = [
  {
    label: 'Home',
    href: '/',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
    center: false,
  },
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    center: false,
  },
  {
    label: 'Decks',
    href: '/decks',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    center: true,
  },
  {
    label: 'Loja',
    href: '/loja',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    center: false,
  },
  {
    label: 'Perfil',
    href: '/perfil',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    center: false,
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith('/play') || pathname.startsWith('/resultado')) {
    return null;
  }

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 sm:left-1/2 sm:right-auto sm:w-[32rem] sm:-translate-x-1/2">
      <div className="glass-nav px-1.5 py-2">
        <div className="flex items-center justify-around gap-0.5">
          {tabs.map((tab) => {
            const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);

            if (tab.center) {
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="relative -mt-4 flex flex-col items-center justify-center"
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg transition-all ${
                      isActive
                        ? 'border-cyan-300/30 bg-cyan-300/16 shadow-[0_0_24px_rgba(103,232,249,0.3)]'
                        : 'border-white/12 bg-white/8 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-6 w-6 ${isActive ? 'text-cyan-300 drop-shadow-[0_0_12px_rgba(103,232,249,0.65)]' : 'text-white/65'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                    </svg>
                  </div>
                  <span
                    className={`mt-1 text-[10px] font-semibold tracking-[0.1em] ${isActive ? 'text-cyan-300' : 'text-white/48'}`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.2rem] px-1 py-2"
              >
                {isActive && (
                  <>
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-[1.12rem] border border-white/16 bg-white/[0.08]"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute left-1/2 top-1 h-1 w-7 -translate-x-1/2 rounded-full bg-cyan-300/90 shadow-[0_0_18px_rgba(103,232,249,0.85)]"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`relative z-10 h-5 w-5 ${isActive ? 'text-cyan-300 drop-shadow-[0_0_12px_rgba(103,232,249,0.65)]' : 'text-white/55'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                <span
                  className={`relative z-10 text-[10px] font-medium tracking-[0.06em] ${isActive ? 'text-white' : 'text-white/48'}`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

Key changes:
- 5 tabs instead of 3
- Center Decks tab floats up with `-mt-4`, larger icon (h-14 w-14), rounded-2xl
- Nav wider on desktop: `sm:w-[32rem]`
- Active detection: exact match for `/`, startsWith for others
- Indicator pill `w-7` (was `w-9`) to fit 5 tabs
- Tighter gaps: `gap-0.5`, `px-1`

**Step 2: Verify nav renders with 5 tabs**

Run: `npx next dev` and check all 5 tabs appear. Center tab should float above others.

---

### Task 2: Create /dashboard page (stats + runs + rankings)

**Files:**
- Create: `src/app/dashboard/page.tsx`

**Step 1: Create the dashboard page**

This page takes the stats/runs content from the old `/config` page.

```typescript
'use client';

import { motion } from 'framer-motion';
import RunReportCard from '@/components/RunReportCard';
import { useGame, getPrecisionLabel, getConsistencyLabel } from '@/context/GameContext';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS } from '@/types/game';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38 } },
};

/** Map a run snapshot rank (completion %) to E-S tier */
function getRankTier(completion: number): { rank: string; color: string } {
  if (completion >= 95) return { rank: 'S', color: '#d4af37' };
  if (completion >= 80) return { rank: 'A', color: '#8b5cf6' };
  if (completion >= 65) return { rank: 'B', color: '#60a5fa' };
  if (completion >= 50) return { rank: 'C', color: '#34d399' };
  if (completion >= 30) return { rank: 'D', color: '#fb923c' };
  return { rank: 'E', color: '#ef4444' };
}

export default function DashboardPage() {
  const { state, getArchetype, precision, consistency } = useGame();
  const archetype = getArchetype();
  const snapshots = [...state.calibration.snapshots].reverse();
  const recentRuns = snapshots.slice(0, 6);
  const precisionLabel = getPrecisionLabel(precision);
  const consistencyLabel = getConsistencyLabel(consistency);
  const maxAbs = Math.max(1, ...STAT_KEYS.map(k => Math.abs(state.calibration.axes[k])));

  return (
    <motion.div
      className="screen-stage mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="screen-lights" />
      <div className="screen-arena-floor opacity-45" />

      {/* Header */}
      <motion.header variants={fadeUp}>
        <div className="glass-pill mb-3 inline-flex items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/68">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" />
          Dashboard
        </div>
        <h2 className="text-2xl font-bold text-white/92">Tuas Estatisticas</h2>
        <p className="mt-1 text-sm text-white/42">Radar, historico e performance por deck.</p>
      </motion.header>

      {/* Radar / Axes section */}
      <motion.section variants={fadeUp} className="glass-card rounded-[1.6rem] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">
          Radar de eixos
        </p>
        <div className="space-y-2.5">
          {STAT_KEYS.map((key, index) => {
            const value = state.calibration.axes[key];
            const width = `${(Math.abs(value) / maxAbs) * 100}%`;
            const color = value >= 0 ? STAT_COLORS[key] : '#ef4444';

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 + index * 0.05, duration: 0.28 }}
                className="glass-surface rounded-[1.1rem] px-3 py-2.5"
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
                    {STAT_LABELS[key]}
                  </span>
                  <span className="text-[11px] font-mono font-bold" style={{ color }}>
                    {value > 0 ? '+' : ''}{value.toFixed(1)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width }}
                    transition={{ delay: 0.14 + index * 0.05, duration: 0.45, ease: 'easeOut' }}
                    style={{ backgroundColor: color }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Precision + Consistency mini bars */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="glass-surface rounded-[1.1rem] px-3 py-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/46">Precisao</span>
              <span className="text-[11px] font-mono font-bold" style={{ color: precisionLabel.color === 'text-accent-gold' ? '#d4af37' : precisionLabel.color === 'text-accent-purple' ? '#8b5cf6' : '#fb923c' }}>
                {Math.round(precision)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
              <motion.div className="h-full rounded-full bg-accent-purple" initial={{ width: 0 }} animate={{ width: `${Math.min(precision, 100)}%` }} transition={{ delay: 0.5, duration: 0.5 }} />
            </div>
            <p className="mt-1.5 text-[10px] text-white/34">{precisionLabel.label}</p>
          </div>
          <div className="glass-surface rounded-[1.1rem] px-3 py-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/46">Consistencia</span>
              <span className="text-[11px] font-mono font-bold" style={{ color: consistency >= 0.6 ? '#d4af37' : consistency >= 0.3 ? '#8b5cf6' : '#f87171' }}>
                {Math.round(consistency * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
              <motion.div className="h-full rounded-full bg-accent-gold" initial={{ width: 0 }} animate={{ width: `${Math.min(consistency * 100, 100)}%` }} transition={{ delay: 0.55, duration: 0.5 }} />
            </div>
            <p className="mt-1.5 text-[10px] text-white/34">{consistencyLabel.label}</p>
          </div>
        </div>
      </motion.section>

      {/* Rankings per deck */}
      {snapshots.length > 0 && (
        <motion.section variants={fadeUp} className="glass-card rounded-[1.6rem] p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">
            Rankings por deck
          </p>
          <div className="space-y-2">
            {snapshots.map((snap) => {
              const tier = getRankTier(snap.completion);
              return (
                <div
                  key={`${snap.deckId}-${snap.completedAt}`}
                  className="glass-surface flex items-center gap-3 rounded-xl px-3 py-2.5"
                >
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border text-base font-black"
                    style={{ borderColor: `${tier.color}40`, color: tier.color, backgroundColor: `${tier.color}12` }}
                  >
                    {tier.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white/80">{snap.deckId.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-white/34">{Math.round(snap.completion)}% completion</p>
                  </div>
                  <p className="text-[10px] text-white/24">{new Date(snap.completedAt).toLocaleDateString('pt-BR')}</p>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* Recent runs */}
      {recentRuns.length > 0 && (
        <motion.section variants={fadeUp}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">
            Ultimas runs
          </p>
          <div className="space-y-3">
            {recentRuns.map((snap) => (
              <RunReportCard key={`${snap.deckId}-${snap.completedAt}`} snapshot={snap} />
            ))}
          </div>
        </motion.section>
      )}

      {/* Empty state */}
      {snapshots.length === 0 && (
        <motion.section variants={fadeUp} className="glass-card rounded-[1.6rem] p-6 text-center">
          <p className="text-sm text-white/40">Nenhuma run concluida ainda.</p>
          <p className="mt-1 text-[11px] text-white/24">Completa um deck para ver as tuas stats aqui.</p>
        </motion.section>
      )}
    </motion.div>
  );
}
```

---

### Task 3: Create /perfil page (identity + settings)

**Files:**
- Create: `src/app/perfil/page.tsx`

**Step 1: Create the perfil page**

This page shows the 9:16 archetype portrait, nickname, precision/consistency bars, and config buttons (edit nickname, settings, delete account, about).

```typescript
'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame, getPrecisionLabel, getConsistencyLabel } from '@/context/GameContext';
import {
  getArchetypeAvatarPaths,
  getArchetypeAvatarVisual,
  type AvatarVariant,
} from '@/lib/archetypeAvatar';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38 } },
};

const NICKNAME_KEY = 'mindpractice_nickname';
const AVATAR_VARIANT_KEY = 'mindpractice_avatar_variant';

export default function PerfilPage() {
  const { state, dispatch, getArchetype, precision, consistency, isIdentityValidated } = useGame();
  const archetype = getArchetype();
  const precisionLabel = getPrecisionLabel(precision);
  const consistencyLabel = getConsistencyLabel(consistency);

  const [nickname, setNickname] = useState('Jogador');
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [variant, setVariant] = useState<AvatarVariant>('masculino');
  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(NICKNAME_KEY);
    if (stored) setNickname(stored);
    const storedVariant = localStorage.getItem(AVATAR_VARIANT_KEY);
    if (storedVariant === 'masculino' || storedVariant === 'feminino') setVariant(storedVariant);
  }, []);

  useEffect(() => {
    setImageIndex(0);
    setImageFailed(false);
  }, [archetype.id, variant]);

  const visual = useMemo(() => getArchetypeAvatarVisual(archetype), [archetype]);
  const imageCandidates = getArchetypeAvatarPaths(archetype.id, variant);
  const imageSrc = imageCandidates[imageIndex];

  function handleSaveNickname() {
    const trimmed = nicknameInput.trim();
    if (trimmed.length > 0 && trimmed.length <= 20) {
      setNickname(trimmed);
      localStorage.setItem(NICKNAME_KEY, trimmed);
    }
    setEditingNickname(false);
  }

  function handleReset() {
    if (confirm('Tem certeza? Todo progresso sera apagado.')) {
      dispatch({ type: 'RESET_ALL' });
      localStorage.removeItem('mindpractice_state');
    }
  }

  function handleToggleVariant() {
    const next = variant === 'masculino' ? 'feminino' : 'masculino';
    setVariant(next);
    localStorage.setItem(AVATAR_VARIANT_KEY, next);
  }

  return (
    <motion.div
      className="screen-stage mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="screen-lights" />
      <div className="screen-arena-floor opacity-45" />

      {/* 9:16 Archetype Portrait */}
      <motion.section variants={fadeUp} className="glass-card relative overflow-hidden rounded-[1.8rem]">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: visual.background }}
        />
        <div className="pointer-events-none absolute inset-x-[16%] top-[4%] h-36 rounded-full blur-[74px]" style={{ backgroundColor: visual.glow }} />

        <div className="relative aspect-[9/16] min-h-[28rem]">
          {!imageFailed && (
            <img
              src={imageSrc}
              alt={`${archetype.name} ${variant}`}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => {
                if (imageIndex < imageCandidates.length - 1) {
                  setImageIndex(prev => prev + 1);
                  return;
                }
                setImageFailed(true);
              }}
            />
          )}

          {imageFailed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div
                  className="mx-auto mb-4 h-24 w-24 rounded-full border-2"
                  style={{ borderColor: visual.line, backgroundColor: `${visual.glow}20` }}
                />
                <p className="text-sm text-white/40">Arte em breve</p>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,4,8,0.02),rgba(3,3,7,0.1)_30%,rgba(3,3,7,0.8))]" />

          {/* Variant toggle */}
          <button
            onClick={handleToggleVariant}
            className="glass-pill absolute right-3 top-3 z-20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 transition-colors hover:text-white/90"
          >
            {variant === 'masculino' ? 'Fem' : 'Masc'}
          </button>

          {/* Bottom overlay: name + nickname */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 pt-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">
              {archetype.tagline}
            </p>
            <h2 className="mt-1 text-3xl font-bold text-white/95">{archetype.name}</h2>
            <p className="mt-1 text-sm text-white/50">{nickname}</p>
            {isIdentityValidated && (
              <span className="mt-2 inline-block rounded-full border border-accent-gold/25 bg-accent-gold/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-gold">
                Identidade confirmada
              </span>
            )}
          </div>
        </div>
      </motion.section>

      {/* Precision + Consistency bars */}
      <motion.section variants={fadeUp} className="glass-card rounded-[1.4rem] px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/46">Precisao</span>
              <span className="text-[11px] font-mono font-bold text-accent-purple">{Math.round(precision)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <motion.div className="h-full rounded-full bg-accent-purple" initial={{ width: 0 }} animate={{ width: `${Math.min(precision, 100)}%` }} transition={{ delay: 0.3, duration: 0.5 }} />
            </div>
            <p className="mt-1 text-[10px] text-white/30">{precisionLabel.label}</p>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/46">Consistencia</span>
              <span className="text-[11px] font-mono font-bold text-accent-gold">{Math.round(consistency * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <motion.div className="h-full rounded-full bg-accent-gold" initial={{ width: 0 }} animate={{ width: `${Math.min(consistency * 100, 100)}%` }} transition={{ delay: 0.35, duration: 0.5 }} />
            </div>
            <p className="mt-1 text-[10px] text-white/30">{consistencyLabel.label}</p>
          </div>
        </div>
      </motion.section>

      {/* Config buttons */}
      <motion.section variants={fadeUp} className="flex flex-col gap-2">
        {/* Edit nickname */}
        {editingNickname ? (
          <div className="glass-card flex items-center gap-2 rounded-xl px-4 py-3">
            <input
              type="text"
              value={nicknameInput}
              onChange={e => setNicknameInput(e.target.value)}
              maxLength={20}
              placeholder="Novo nickname"
              className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/30 outline-none"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaveNickname()}
            />
            <button
              onClick={handleSaveNickname}
              className="glass-pill px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300"
            >
              Salvar
            </button>
            <button
              onClick={() => setEditingNickname(false)}
              className="px-2 py-1.5 text-[10px] text-white/40"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setNicknameInput(nickname); setEditingNickname(true); }}
            className="glass-card flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-white/[0.06]"
          >
            <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-white/80">Editar nickname</p>
              <p className="text-[11px] text-white/34">{nickname}</p>
            </div>
          </button>
        )}

        {/* About */}
        <div className="glass-card flex items-center gap-3 rounded-xl px-4 py-3.5">
          <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-white/80">Sobre</p>
            <p className="text-[11px] text-white/34">MindPractice v0.2.0</p>
          </div>
        </div>

        {/* Reset / Delete */}
        <button
          onClick={handleReset}
          className="glass-card flex items-center gap-3 rounded-xl border border-red-400/12 px-4 py-3.5 text-left transition-colors hover:bg-red-500/8"
        >
          <svg className="h-5 w-5 text-red-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-200/80">Apagar progresso</p>
            <p className="text-[11px] text-red-200/40">Remove calibracao, historico e desbloqueios</p>
          </div>
        </button>
      </motion.section>
    </motion.div>
  );
}
```

---

### Task 4: Create /loja placeholder page

**Files:**
- Create: `src/app/loja/page.tsx`

**Step 1: Create the loja page**

Simple placeholder with nice styling. This will be expanded later.

```typescript
'use client';

import { motion } from 'framer-motion';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38 } },
};

export default function LojaPage() {
  return (
    <motion.div
      className="screen-stage mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="screen-lights" />
      <div className="screen-arena-floor opacity-45" />

      <motion.header variants={fadeUp}>
        <div className="glass-pill mb-3 inline-flex items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/68">
          <span className="h-2 w-2 rounded-full bg-accent-gold shadow-[0_0_14px_rgba(212,175,55,0.9)]" />
          Loja
        </div>
        <h2 className="text-2xl font-bold text-white/92">Mundo</h2>
        <p className="mt-1 text-sm text-white/42">Desbloqueia novos decks e conteudo premium.</p>
      </motion.header>

      <motion.section variants={fadeUp} className="glass-card rounded-[1.6rem] p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-gold/20 bg-accent-gold/8">
          <svg className="h-8 w-8 text-accent-gold/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-white/80">Em breve</p>
        <p className="mt-2 text-sm leading-relaxed text-white/40">
          Novos decks, cenarios exclusivos e conteudo premium vao aparecer aqui.
        </p>
      </motion.section>
    </motion.div>
  );
}
```

---

### Task 5: Redesign /decks page with selection slot

**Files:**
- Modify: `src/app/decks/page.tsx`

**Step 1: Add selection slot UI**

The center tab page now shows the full deck library. When a deck is selected, a beautiful bottom slot appears with a preview and a "Jogar" button.

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getDecksByCategory, getWeeklyFreeDeckIds } from '@/data/decks/index';
import type { Deck, DeckCategory } from '@/types/game';
import DeckCard from '@/components/DeckCard';

const TABS: { id: DeckCategory; label: string }[] = [
  { id: 'essencial', label: 'Essenciais' },
  { id: 'arquetipo', label: 'Arquetipos' },
  { id: 'cenario', label: 'Cenarios' },
];

function formatTimeLeft(ms: number): string {
  if (ms === Infinity) return 'Complete o deck anterior';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function DecksPage() {
  const [activeTab, setActiveTab] = useState<DeckCategory>('essencial');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const router = useRouter();
  const { state, dispatch, isDeckLocked, getTimeUntilUnlock } = useGame();
  const weeklyFree = getWeeklyFreeDeckIds();

  const decks = getDecksByCategory(activeTab);

  const handleSelect = (deck: Deck) => {
    const locked = isDeckLocked(deck.deckId) && !weeklyFree.includes(deck.deckId);
    if (locked) return;
    setSelectedDeck(deck);
  };

  const handlePlay = () => {
    if (!selectedDeck) return;
    dispatch({ type: 'START_DECK', deck: selectedDeck });
    router.push(`/play/${selectedDeck.deckId}`);
  };

  return (
    <main className="screen-stage mx-auto flex min-h-screen max-w-md flex-col px-4 pb-48 py-8">
      <div className="screen-lights" />
      <div className="screen-arena-floor opacity-55" />
      <div className="stadium-shell" />
      <div className="stadium-side-light" />
      <div className="stadium-side-light-right" />
      <div className="stadium-horizon" />

      {/* Header */}
      <div className="mb-6">
        <div className="glass-pill inline-flex items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/68">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" />
          Biblioteca de treino
        </div>
        <h2 className="mt-4 text-2xl font-bold text-white/92">Decks</h2>
        <p className="mt-1 text-sm text-white/46">Escolha seu desafio</p>
      </div>

      {/* Tabs */}
      <div className="glass-surface mb-6 flex gap-2 rounded-[1.4rem] p-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedDeck(null); }}
            className={`glass-button flex-1 px-4 py-2 rounded-full text-xs font-semibold tracking-[0.16em] transition-all ${
              activeTab === tab.id
                ? 'glass-pill text-white shadow-[0_0_18px_rgba(103,232,249,0.16)]'
                : 'glass-pill text-white/46 hover:text-white/72'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deck list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="glass-surface rounded-[1.7rem] p-3 flex flex-col gap-4"
        >
          {decks.map((deck, i) => {
            const isWeeklyFree = weeklyFree.includes(deck.deckId);
            const locked = isDeckLocked(deck.deckId) && !isWeeklyFree;
            const completed = deck.deckId in state.completedDecks;
            const timeLeft = getTimeUntilUnlock(deck.deckId);
            const isSelected = selectedDeck?.deckId === deck.deckId;

            return (
              <div
                key={deck.deckId}
                className={`rounded-2xl transition-all ${isSelected ? 'ring-2 ring-cyan-300/40' : ''}`}
              >
                <DeckCard
                  deck={deck}
                  index={i}
                  locked={locked}
                  completed={completed}
                  isWeeklyFree={isWeeklyFree}
                  timeLeftLabel={formatTimeLeft(timeLeft)}
                  onClick={() => handleSelect(deck)}
                />
              </div>
            );
          })}

          {decks.length === 0 && (
            <p className="text-center text-white/30 text-sm py-8">Nenhum deck nesta categoria ainda.</p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Selection slot — fixed at bottom */}
      <AnimatePresence>
        {selectedDeck && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-x-3 bottom-20 z-40 sm:left-1/2 sm:right-auto sm:w-[28rem] sm:-translate-x-1/2"
          >
            <div className="glass-nav overflow-hidden rounded-2xl border border-cyan-300/16 p-3 shadow-[0_-8px_40px_rgba(103,232,249,0.12)]">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/70">
                    Selecionado
                  </p>
                  <p className="mt-0.5 truncate text-base font-bold text-white/92">
                    {selectedDeck.name}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {selectedDeck.questions.length} cenas
                  </p>
                </div>
                <button
                  onClick={handlePlay}
                  className="flex h-12 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/12 px-5 text-sm font-bold text-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.2)] transition-all hover:bg-cyan-300/18"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Jogar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
```

Key changes vs current:
- Clicking a deck now selects it (shows ring highlight) instead of immediately navigating
- Fixed bottom slot appears with deck preview + "Jogar" button
- `pb-48` on main to leave room for slot + nav
- Tab switch clears selection

---

### Task 6: Redesign Home page with suggestions

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Redesign home with suggestions, daily mission, and premium teasers**

```typescript
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { getWeeklyFreeDeckIds, getDeckById, ALL_DECKS } from '@/data/decks/index';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS } from '@/types/game';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function Home() {
  const { state, getArchetype, precision, isDeckLocked } = useGame();
  const hasPlayed = Object.keys(state.completedDecks).length > 0;
  const archetype = getArchetype();
  const weeklyFree = getWeeklyFreeDeckIds();

  // Suggestions: uncompleted unlocked decks first, then weekly free
  const suggestions = ALL_DECKS
    .filter(d => !(d.deckId in state.completedDecks) && (!isDeckLocked(d.deckId) || weeklyFree.includes(d.deckId)))
    .slice(0, 3);

  // Daily mission: first weekly free deck that hasn't been completed
  const dailyMission = weeklyFree
    .map(id => getDeckById(id))
    .find(d => d && !(d.deckId in state.completedDecks)) ?? null;

  // Premium teaser: locked decks
  const premiumDecks = ALL_DECKS
    .filter(d => isDeckLocked(d.deckId) && !weeklyFree.includes(d.deckId))
    .slice(0, 2);

  return (
    <motion.main variants={container} initial="hidden" animate="show"
      className="screen-stage mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
      <div className="screen-lights" />
      <div className="screen-arena-floor" />

      {/* Hero */}
      <motion.div variants={fadeUp} className="text-center">
        <h1 className="text-3xl font-bold leading-tight tracking-tight">
          Mind<span className="text-accent-purple">Practice</span>
        </h1>
        {hasPlayed ? (
          <p className="mt-2 text-sm text-white/50">
            Bem-vindo de volta, <span className="font-semibold text-white/70">{archetype.name}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-white/50">
            Treina a tua mente para situacoes reais.
          </p>
        )}
      </motion.div>

      {/* Quick archetype card (if played) */}
      {hasPlayed && (
        <motion.div variants={fadeUp} className="glass-card rounded-[1.4rem] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Teu Arquetipo</p>
              <p className="mt-1 text-lg font-bold text-accent-gold">{archetype.name}</p>
              <p className="text-[11px] italic text-white/40">{archetype.tagline}</p>
            </div>
            <div className="text-right">
              <div className="glass-pill inline-flex h-3 w-20 overflow-hidden p-[2px]">
                <div className="h-full rounded-full bg-accent-purple" style={{ width: `${Math.min(precision, 100)}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-white/30">{Math.round(precision)}% precisao</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Daily mission */}
      {dailyMission && (
        <motion.div variants={fadeUp}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">
            Missao do dia
          </p>
          <Link href="/decks" className="glass-card group block rounded-[1.4rem] border border-cyan-300/12 px-5 py-4 transition-colors hover:border-cyan-300/24">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/8">
                <svg className="h-5 w-5 text-cyan-300/70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white/85">{dailyMission.name}</p>
                <p className="text-[11px] text-white/40">{dailyMission.questions.length} cenas · Gratis esta semana</p>
              </div>
              <svg className="h-5 w-5 text-white/20 transition-colors group-hover:text-cyan-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Suggested decks */}
      {suggestions.length > 0 && (
        <motion.div variants={fadeUp}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">
            Sugestoes para ti
          </p>
          <div className="space-y-2">
            {suggestions.map(deck => (
              <Link
                key={deck.deckId}
                href="/decks"
                className="glass-card group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.06]"
              >
                {deck.focusAxis && (
                  <div
                    className="h-8 w-8 flex-shrink-0 rounded-lg"
                    style={{ backgroundColor: `${STAT_COLORS[deck.focusAxis]}18`, border: `1px solid ${STAT_COLORS[deck.focusAxis]}30` }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/80">{deck.name}</p>
                  <p className="text-[11px] text-white/34">{deck.questions.length} cenas</p>
                </div>
                <svg className="h-4 w-4 text-white/16 group-hover:text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Premium decks teaser */}
      {premiumDecks.length > 0 && (
        <motion.div variants={fadeUp}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">
            Decks premium
          </p>
          <div className="space-y-2">
            {premiumDecks.map(deck => (
              <div
                key={deck.deckId}
                className="glass-card flex items-center gap-3 rounded-xl px-4 py-3 opacity-60"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-accent-gold/20 bg-accent-gold/8">
                  <svg className="h-4 w-4 text-accent-gold/50" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/60">{deck.name}</p>
                  <p className="text-[11px] text-white/24">Bloqueado</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <motion.div variants={fadeUp} className="pt-2 text-center">
        <Link href="/decks"
          className="glass-button inline-flex items-center gap-3 rounded-full border border-white/18 px-8 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.16)]">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.95)]" />
          {hasPlayed ? 'Escolher Deck' : 'Comecar'}
        </Link>
      </motion.div>

      {/* Stat pills (if played) */}
      {hasPlayed && (
        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2 pb-4">
          {STAT_KEYS.map(key => {
            const value = state.calibration.axes[key];
            return (
              <div key={key} className="glass-pill min-w-16 px-3 py-2 text-center">
                <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/38">{STAT_LABELS[key].slice(0, 3)}</p>
                <p className="mt-0.5 text-sm font-bold" style={{ color: value > 0 ? STAT_COLORS[key] : value < 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                  {value > 0 ? '+' : ''}{value.toFixed(1)}
                </p>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.main>
  );
}
```

Key changes:
- Compact hero (no full-screen center)
- Quick archetype summary card
- Daily mission (weekly free deck) with play icon
- Suggested decks (uncompleted + unlocked)
- Premium decks with lock icons
- Stat pills at bottom
- All links go to `/decks` (center tab)

---

### Task 7: Delete old /config page (now split into /dashboard and /perfil)

**Files:**
- Delete: `src/app/config/page.tsx`

**Step 1: Remove the config page**

The config page content has been split:
- Stats/runs/history → `/dashboard` (Task 2)
- Profile/reset/about → `/perfil` (Task 3)

Delete the file. Any bookmarks to `/config` will 404 — that's fine, it's a local-only app.

---

### Task 8: Verify build and smoke test

**Step 1: Run build**

Run: `npx next build`
Expected: Build succeeds with no errors.

**Step 2: Smoke test navigation**

1. Open app → Home with suggestions
2. Click Dashboard tab → Radar stats
3. Click Decks (center) tab → Library with selection slot
4. Select a deck → Bottom slot appears with "Jogar"
5. Click Loja tab → Placeholder
6. Click Perfil tab → 9:16 portrait + nickname + config buttons
7. Edit nickname → saves
8. Start a game from Decks → nav hides → play → resultado → nav returns
