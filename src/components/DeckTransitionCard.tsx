'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { DECK_UNLOCK_ORDER, getDeckById } from '@/data/decks';
import type { DeckSnapshot, StatKey } from '@/types/game';
import { CALIBRATION_WINDOW, STAT_LABELS, STAT_COLORS } from '@/types/game';

interface DeckTransitionCardProps {
  snapshot: DeckSnapshot | null;
  totalResponsesAfter: number;
  unlockedDecks: string[];
  completedDecks: Record<string, string>;
}

/**
 * Painel de transição pós-deck.
 *
 *   1. Feedback: "você evoluiu X%" + delta no eixo dominante + Δ arquétipo
 *   2. Transição: card do próximo deck com contexto (tema + categoria)
 *   3. Progresso global: "3 de 12 decks — próxima parada: Y"
 */
export default function DeckTransitionCard({
  snapshot,
  totalResponsesAfter,
  unlockedDecks,
  completedDecks,
}: DeckTransitionCardProps) {
  // -- Precisão delta (pts ganhos nesse deck) --
  const answered = snapshot?.answeredCount ?? 0;
  const before = Math.max(0, totalResponsesAfter - answered);
  const precisionBefore = Math.min(before / CALIBRATION_WINDOW, 1) * 100;
  const precisionAfter = Math.min(totalResponsesAfter / CALIBRATION_WINDOW, 1) * 100;
  const precisionDelta = Math.max(0, precisionAfter - precisionBefore);

  // -- Top eixo movido (para destacar impacto) --
  const topAxisMove = snapshot
    ? (Object.entries(snapshot.axisDelta) as [StatKey, number][])
        .map(([k, v]) => ({ key: k, abs: Math.abs(v), signed: v }))
        .sort((a, b) => b.abs - a.abs)[0]
    : null;

  // -- Próximo deck (primeiro unlockedDeck que ainda não foi completado) --
  const doneIds = new Set(Object.keys(completedDecks));
  const nextId = unlockedDecks.find(id => !doneIds.has(id)) ?? null;
  const nextDeck = nextId ? getDeckById(nextId) : null;

  // -- Progresso global: quantos dos 12 foram completados --
  const totalCount = DECK_UNLOCK_ORDER.length;
  const doneCount = DECK_UNLOCK_ORDER.filter(id => doneIds.has(id)).length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.45 }}
      className="w-full space-y-3"
    >
      {/* ========= Deltas ========= */}
      <div className="glass-card rounded-[1.4rem] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
          Nesta sessao
        </p>

        <div className="grid grid-cols-3 gap-2">
          {/* Precisão */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Precisao
            </p>
            <p className="mt-1 text-base font-bold text-accent-purple">
              +{precisionDelta.toFixed(1)}
              <span className="ml-0.5 text-[10px] font-medium text-accent-purple/60">pts</span>
            </p>
          </div>

          {/* Top eixo */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Maior eixo
            </p>
            {topAxisMove && topAxisMove.abs > 0 ? (
              <p
                className="mt-1 text-base font-bold"
                style={{
                  color: topAxisMove.signed >= 0
                    ? STAT_COLORS[topAxisMove.key]
                    : '#ef4444',
                }}
              >
                {topAxisMove.signed >= 0 ? '+' : ''}{topAxisMove.signed.toFixed(1)}
                <span className="ml-1 text-[9px] font-medium uppercase tracking-wider opacity-75">
                  {STAT_LABELS[topAxisMove.key]}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-base font-bold text-white/50">—</p>
            )}
          </div>

          {/* Arquétipo */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Arquetipo
            </p>
            <p
              className={`mt-1 text-base font-bold ${
                snapshot?.archetypeChanged ? 'text-accent-gold' : 'text-white/62'
              }`}
            >
              {snapshot?.archetypeChanged ? 'Mudou' : 'Firme'}
            </p>
          </div>
        </div>
      </div>

      {/* ========= Próximo deck ========= */}
      {nextDeck && (
        <Link
          href={`/play/${nextDeck.deckId}`}
          className="block overflow-hidden rounded-[1.4rem] border border-accent-gold/30 bg-gradient-to-br from-accent-gold/[0.08] to-transparent p-4 transition-colors hover:bg-accent-gold/[0.12]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-accent-gold/80">
                Proxima parada
              </p>
              <p className="mt-1 text-base font-bold text-white/95">
                {nextDeck.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-white/55">
                {nextDeck.tema} · {nextDeck.category}
              </p>
            </div>
            <svg className="mt-1 h-5 w-5 shrink-0 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </Link>
      )}

      {/* ========= Progresso global ========= */}
      <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
            Jornada
          </p>
          <p className="text-[11px] font-semibold tabular-nums text-white/70">
            {doneCount}<span className="text-white/35"> / {totalCount}</span>
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-gold"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, delay: 1, ease: 'easeOut' }}
          />
        </div>
        {nextDeck ? (
          <p className="mt-2 text-[10px] text-white/40">
            Faltam {totalCount - doneCount} deck{totalCount - doneCount === 1 ? '' : 's'} pra fechar a jornada.
          </p>
        ) : (
          <p className="mt-2 text-[10px] text-accent-gold/80">
            Jornada completa. Cada novo deck refina ainda mais seu perfil.
          </p>
        )}
      </div>
    </motion.div>
  );
}
