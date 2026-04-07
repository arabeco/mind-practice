'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { use } from 'react';
import RunReportCard from '@/components/RunReportCard';
import ShareButton from '@/components/ShareButton';
import { useGame } from '@/context/GameContext';
import { getDeckById } from '@/data/decks';
import { STAT_KEYS, STAT_LABELS, STAT_COLORS } from '@/types/game';

export default function ResultadoPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const { state, getArchetype, precision, consistency } = useGame();
  const archetype = getArchetype();
  const snapshots = [...state.calibration.snapshots].reverse();
  const featuredSnapshot = snapshots.find(s => s.deckId === deckId) ?? snapshots[0] ?? null;
  const relatedDeck = getDeckById(deckId);
  const [showDetails, setShowDetails] = useState(false);
  const [nickname, setNickname] = useState('Jogador');

  useEffect(() => {
    const stored = localStorage.getItem('mindpractice_nickname');
    if (stored) setNickname(stored);
  }, []);

  const archetypeChanged = featuredSnapshot?.archetypeChanged ?? false;
  const maxAbs = Math.max(1, ...STAT_KEYS.map(k => Math.abs(state.calibration.axes[k])));

  const archetypeTimeline = useMemo(() => {
    const timeline: { date: string; archetype: string }[] = [];
    let lastArch = '';
    for (const snap of state.calibration.snapshots) {
      if (snap.archetypeAtCompletion !== lastArch) {
        timeline.push({
          date: new Date(snap.completedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
          archetype: snap.archetypeAtCompletion,
        });
        lastArch = snap.archetypeAtCompletion;
      }
    }
    return timeline;
  }, [state.calibration.snapshots]);

  return (
    <div className="screen-stage relative min-h-screen px-4 py-6">
      <div className="screen-lights" />
      <div className="screen-arena-floor opacity-52" />
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
        <div className="mt-12 h-[320px] w-[320px] rounded-full bg-accent-gold/6 blur-[90px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mx-auto flex w-full max-w-md flex-col items-center gap-4 pt-6"
      >
        {/* Completion badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
          className="text-center"
        >
          <div className="glass-pill mx-auto mb-2 inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-accent-gold/80">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
            Concluido
          </div>
          <p className="text-sm text-white/40">
            {relatedDeck ? relatedDeck.name : 'Run finalizada'}
          </p>
        </motion.div>

        {/* Archetype — big and prominent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-center"
        >
          <motion.h1
            initial={{ opacity: 0, filter: 'blur(12px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            className="text-3xl font-bold text-white/95"
            style={{
              textShadow: archetypeChanged
                ? '0 0 40px rgba(212,175,55,0.4), 0 0 80px rgba(212,175,55,0.15)'
                : '0 0 30px rgba(103,232,249,0.2)',
            }}
          >
            {archetype.name}
          </motion.h1>
          <p className="mt-1 text-sm italic text-white/40">{archetype.tagline}</p>

          {/* Change indicator */}
          {archetypeChanged ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent-gold/30 bg-accent-gold/12 px-3 py-1.5"
            >
              <svg className="h-3.5 w-3.5 text-accent-gold" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
              </svg>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-gold">
                Arquetipo mudou!
              </span>
            </motion.div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/30"
            >
              Manteve-se
            </motion.p>
          )}
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link
            href="/decks"
            className="glass-button inline-flex items-center gap-2.5 rounded-full border border-white/18 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.16)]"
          >
            <svg className="h-4 w-4 text-cyan-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Proximo Deck
          </Link>
        </motion.div>

        {/* Share card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <ShareButton
            archetype={archetype}
            axes={state.calibration.axes}
            nickname={nickname}
          />
        </motion.div>

        {/* Expandable details */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="w-full"
        >
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mx-auto flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white/34 transition-colors hover:text-white/50"
          >
            {showDetails ? 'Esconder detalhes' : 'Ver detalhes'}
            <motion.svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              animate={{ rotate: showDetails ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-4 pt-3">
                  {/* Axis bars */}
                  <div className="glass-card rounded-[1.4rem] p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">
                      Eixos atuais
                    </p>
                    <div className="space-y-2">
                      {STAT_KEYS.map((key) => {
                        const value = state.calibration.axes[key];
                        const width = `${(Math.abs(value) / maxAbs) * 100}%`;
                        const color = value >= 0 ? STAT_COLORS[key] : '#ef4444';
                        return (
                          <div key={key} className="glass-surface rounded-xl px-3 py-2">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/46">
                                {STAT_LABELS[key]}
                              </span>
                              <span className="text-[10px] font-mono font-bold" style={{ color }}>
                                {value > 0 ? '+' : ''}{value.toFixed(1)}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                style={{ backgroundColor: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Precision + Consistency */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="glass-surface rounded-xl px-3 py-2.5">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Precisao</span>
                        <p className="mt-0.5 text-sm font-bold text-accent-purple">{Math.round(precision)}%</p>
                      </div>
                      <div className="glass-surface rounded-xl px-3 py-2.5">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Consistencia</span>
                        <p className="mt-0.5 text-sm font-bold text-accent-gold">{Math.round(consistency * 100)}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Featured run report */}
                  {featuredSnapshot && (
                    <RunReportCard snapshot={featuredSnapshot} featured />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Evolution timeline */}
        {archetypeTimeline.length >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="w-full"
          >
            <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30">
              Evolucao
            </p>
            <div className="flex items-center justify-center gap-1">
              {archetypeTimeline.map((entry, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="flex flex-col items-center">
                    <div className={`h-2.5 w-2.5 rounded-full ${i === archetypeTimeline.length - 1 ? 'bg-accent-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]' : 'bg-white/20'}`} />
                    <p className="mt-1 text-[8px] text-white/40">{entry.date}</p>
                    <p className="text-[9px] font-semibold text-white/60">{entry.archetype}</p>
                  </div>
                  {i < archetypeTimeline.length - 1 && (
                    <div className="mb-4 h-px w-6 bg-white/15" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
