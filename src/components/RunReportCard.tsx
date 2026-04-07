'use client';

import { motion } from 'framer-motion';
import { getDeckById } from '@/data/decks';
import {
  getProfileShiftLabel,
  getRunScoreLabel,
  getRunScoreTint,
} from '@/lib/runScoring';
import {
  STAT_COLORS,
  STAT_KEYS,
  STAT_LABELS,
  TIER_CONFIG,
  type DeckSnapshot,
  type StatKey,
} from '@/types/game';

interface RunReportCardProps {
  snapshot: DeckSnapshot;
  featured?: boolean;
  className?: string;
}

export default function RunReportCard({
  snapshot,
  featured = false,
  className = '',
}: RunReportCardProps) {
  const deck = getDeckById(snapshot.deckId);
  const scoreLabel = getRunScoreLabel(snapshot.runScore);
  const scoreTint = getRunScoreTint(snapshot.runScore);
  const profileShiftLabel = getProfileShiftLabel(snapshot.profileShift);
  const dominantAxisLabel = snapshot.dominantAxis
    ? STAT_LABELS[snapshot.dominantAxis]
    : 'Nao definido';
  const axisDeltaEntries = STAT_KEYS
    .map(key => ({ key, value: snapshot.axisDelta[key] }))
    .filter(entry => Math.abs(entry.value) >= 0.05)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, featured ? 3 : 2);
  const tier = deck ? TIER_CONFIG[deck.tier] : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`glass-card relative rounded-[1.55rem] ${featured ? 'p-5 sm:p-6' : 'p-4'} ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-70 blur-3xl"
        style={{ background: `radial-gradient(circle at top, ${scoreTint}30, transparent 72%)` }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/34">
              {featured ? 'Run atual' : 'Run registrada'}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white/92">
              {deck?.name ?? snapshot.deckId}
            </h3>
            <p className="mt-1 text-sm text-white/48">
              {formatRunDate(snapshot.completedAt)}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {tier && (
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tier.badgeClass}`}>
                {tier.label}
              </span>
            )}
            {snapshot.legacy && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/48">
                Legacy
              </span>
            )}
          </div>
        </div>

        <div className={`mt-5 grid gap-4 ${featured ? 'lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]' : ''}`}>
          <div className="glass-surface-strong rounded-[1.3rem] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
              Signal score
            </p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-4xl font-bold tracking-tight" style={{ color: scoreTint }}>
                {snapshot.runScore ?? '--'}
              </span>
              <div className="pb-1">
                <p className="text-sm font-semibold text-white/75">{scoreLabel}</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/32">
                  clareza da run
                </p>
              </div>
            </div>

            {snapshot.scoreBreakdown ? (
              <div className="mt-5 space-y-3">
                <BreakdownBar
                  label="Completion"
                  value={snapshot.scoreBreakdown.completion}
                  max={30}
                  tint={scoreTint}
                />
                <BreakdownBar
                  label="Decisiveness"
                  value={snapshot.scoreBreakdown.decisiveness}
                  max={35}
                  tint="#7dd3fc"
                />
                <BreakdownBar
                  label="Coherence"
                  value={snapshot.scoreBreakdown.coherence}
                  max={35}
                  tint="#a78bfa"
                />
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-white/48">
                Snapshot antigo. Esta run foi preservada, mas ainda nao tinha leitura detalhada.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricTile label="Arquetipo" value={snapshot.archetypeAtCompletion} />
              <MetricTile label="Eixo dominante" value={dominantAxisLabel} />
              <MetricTile label="Respondidas" value={String(snapshot.answeredCount)} />
              <MetricTile label="Timeouts" value={String(snapshot.timeoutCount)} />
            </div>

            <div className="glass-surface rounded-[1.2rem] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                    Mudanca no perfil
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white/84">
                    {profileShiftLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/26">
                    deslocamento total
                  </p>
                  <p className="mt-2 text-lg font-semibold" style={{ color: scoreTint }}>
                    {snapshot.profileShift.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/62">
                <span className="glass-pill px-2.5 py-1">
                  Antes: {snapshot.archetypeBeforeRun ?? 'Indisponivel'}
                </span>
                <span className="text-white/26">{'->'}</span>
                <span className="glass-pill px-2.5 py-1">
                  Depois: {snapshot.archetypeAtCompletion}
                </span>
                <span
                  className={`glass-pill px-2.5 py-1 font-semibold uppercase tracking-[0.14em] ${
                    snapshot.archetypeChanged
                      ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                      : 'text-white/55'
                  }`}
                >
                  {snapshot.archetypeChanged ? 'Mudou de arquetipo' : 'Arquetipo mantido'}
                </span>
              </div>
            </div>

            {snapshot.focusAlignment !== null && (
              <div className="glass-surface rounded-[1.2rem] border-cyan-400/18 bg-cyan-400/6 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/72">
                    Alinhamento ao foco
                  </p>
                  <p className="text-sm font-semibold text-cyan-100">
                    {snapshot.focusAlignment}%
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/25">
                  <div
                    className="h-full rounded-full bg-cyan-300"
                    style={{ width: `${snapshot.focusAlignment}%` }}
                  />
                </div>
              </div>
            )}

            <div className="glass-surface rounded-[1.2rem] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                  Delta dos eixos
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/26">
                  fim vs inicio
                </p>
              </div>
              <div className="mt-3 space-y-2.5">
                {axisDeltaEntries.length > 0 ? (
                  axisDeltaEntries.map(entry => (
                    <AxisDeltaRow key={entry.key} axis={entry.key} value={entry.value} />
                  ))
                ) : (
                  <p className="text-sm text-white/42">
                    Sem variacao registrada nesta versao da run.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function BreakdownBar({
  label,
  value,
  max,
  tint,
}: {
  label: string;
  value: number;
  max: number;
  tint: string;
}) {
  const width = `${Math.min((value / max) * 100, 100)}%`;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</span>
        <span className="text-[11px] font-mono font-semibold" style={{ color: tint }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width, backgroundColor: tint }} />
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-surface rounded-[1.1rem] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/32">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white/82">{value}</p>
    </div>
  );
}

function AxisDeltaRow({ axis, value }: { axis: StatKey; value: number }) {
  const tint = value >= 0 ? STAT_COLORS[axis] : '#f87171';
  const width = `${Math.min(Math.abs(value) * 14, 100)}%`;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-white/42">
          {STAT_LABELS[axis]}
        </span>
        <span className="text-[11px] font-mono font-semibold" style={{ color: tint }}>
          {value > 0 ? '+' : ''}
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width, backgroundColor: tint }} />
      </div>
    </div>
  );
}

function formatRunDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponivel';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
