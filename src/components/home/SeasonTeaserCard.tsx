'use client';

// ============================================================================
// SeasonTeaserCard — card persistente na home anunciando season atual/próxima.
// 3 estados derivados de getCurrentTeaserSeason():
//  - pre-launch: selo + "em N dias" + opt-in push
//  - fresh: selo grande + "Chegou a Season X" + CTA pra /decks
//  - ongoing: mini card só com selo + contador de decks
// ============================================================================

import Link from 'next/link';
import { getCurrentTeaserSeason } from '@/data/seasons';

export function SeasonTeaserCard() {
  const teaser = getCurrentTeaserSeason();
  if (!teaser) return null;

  const { season, state } = teaser;
  const Seal = season.Seal;

  if (state === 'pre-launch') {
    const launchMs = Date.parse(season.launchDate);
    const daysUntil = Math.max(1, Math.ceil((launchMs - Date.now()) / (1000 * 60 * 60 * 24)));
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/60 to-slate-900/40 p-4">
        <div className="flex items-center gap-3">
          <Seal size={48} />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-white/50">Chegando</div>
            <div className="text-base font-semibold text-white">
              Season · {season.title}
            </div>
            <div className="text-xs text-white/60">em {daysUntil} {daysUntil === 1 ? 'dia' : 'dias'}</div>
          </div>
        </div>
        <p className="mt-2 text-sm text-white/70">{season.theme}</p>
      </div>
    );
  }

  if (state === 'fresh') {
    return (
      <Link
        href={`/decks?season=${season.id}`}
        className="block rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-900/30 to-slate-900/30 p-4 shadow-[0_0_24px_rgba(251,191,36,0.25)] transition hover:shadow-[0_0_32px_rgba(251,191,36,0.45)]"
      >
        <div className="flex items-center gap-3">
          <Seal size={56} />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-amber-300/80">Nova Season</div>
            <div className="text-lg font-semibold text-white">{season.title}</div>
            <div className="text-xs text-white/70">{season.theme}</div>
          </div>
        </div>
        <div className="mt-3 text-right text-xs font-semibold text-amber-300">Ver decks novos →</div>
      </Link>
    );
  }

  // ongoing
  return (
    <Link
      href={`/decks?season=${season.id}`}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
    >
      <Seal size={18} />
      <span>{season.title} ativa</span>
    </Link>
  );
}
