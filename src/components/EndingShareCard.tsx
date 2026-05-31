'use client';

import { forwardRef } from 'react';
import type { CampaignEnding, StatKey } from '@/types/game';
import { AXIS_POLES, AXIS_POLE_SLUGS } from '@/lib/axisPoles';

interface EndingShareCardProps {
  ending: CampaignEnding;
  seasonLabel: string;
  deckName: string;
  nickname: string;
}

// Mesmo mapeamento de CampanhaClient — emblemas do caminho que o final representa.
const ENDING_POLES: Record<string, { axis: StatKey; pole: string }[]> = {
  selo_quebrado: [
    { axis: 'vigor', pole: 'agressivo' },
    { axis: 'presenca', pole: 'dominante' },
  ],
  pacto_frio: [
    { axis: 'filtro', pole: 'calculista' },
  ],
  cinzas: [
    { axis: 'desapego', pole: 'desapegado' },
  ],
  reescrita: [
    { axis: 'presenca', pole: 'dominante' },
    { axis: 'harmonia', pole: 'paz' },
  ],
};

function polesFor(endingId: string) {
  const polos = ENDING_POLES[endingId] ?? [];
  return polos.map(p => {
    const slugs = AXIS_POLE_SLUGS[p.axis];
    const labels = AXIS_POLES[p.axis];
    const idx = slugs.findIndex(s => s === p.pole);
    return { slug: p.pole, label: idx >= 0 ? labels[idx] : '' };
  });
}

/**
 * Hidden off-screen card (1080x1920, 9:16 story format) used as html2canvas source.
 * Uses inline styles throughout — Tailwind classes won't render in the canvas.
 */
const EndingShareCard = forwardRef<HTMLDivElement, EndingShareCardProps>(
  ({ ending, seasonLabel, deckName, nickname }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          background:
            'linear-gradient(175deg, #14101f 0%, #080610 45%, #0b0614 100%)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Golden godray from top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 900,
            height: 700,
            background:
              'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.2) 0%, rgba(139,92,246,0.1) 35%, transparent 70%)',
          }}
        />

        {/* Purple glow bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 800,
            height: 500,
            background:
              'radial-gradient(ellipse at 50% 70%, rgba(139,92,246,0.14) 0%, transparent 65%)',
          }}
        />

        {/* Kicker */}
        <div
          style={{
            position: 'absolute',
            top: 220,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.42em',
              color: 'rgba(212,175,55,0.75)',
              textTransform: 'uppercase',
            }}
          >
            Final alcancado
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 20,
              letterSpacing: '0.3em',
              color: 'rgba(255,255,255,0.32)',
              textTransform: 'uppercase',
            }}
          >
            {seasonLabel}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            position: 'absolute',
            top: 440,
            left: 60,
            right: 60,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 108,
              fontWeight: 900,
              color: 'rgba(255,255,255,0.97)',
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              textShadow: '0 6px 48px rgba(212,175,55,0.4)',
            }}
          >
            {ending.title}
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            position: 'absolute',
            top: 760,
            left: 80,
            right: 80,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 40,
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.74)',
              lineHeight: 1.35,
            }}
          >
            &ldquo;{ending.tagline}&rdquo;
          </div>
        </div>

        {/* Emblemas do caminho */}
        {(() => {
          const polos = polesFor(ending.id);
          if (polos.length === 0) {
            return (
              <div
                style={{
                  position: 'absolute',
                  top: 1050,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 120,
                  height: 2,
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.6) 50%, transparent 100%)',
                }}
              />
            );
          }
          return (
            <div
              style={{
                position: 'absolute',
                top: 1010,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 60,
              }}
            >
              {polos.map(p => (
                <div
                  key={p.slug}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
                >
                  <img
                    src={`/icons/${p.slug}.png`}
                    width={160}
                    height={160}
                    alt={p.label}
                    style={{ display: 'block', objectFit: 'contain' }}
                  />
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: '0.24em',
                      color: 'rgba(255,255,255,0.6)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {p.label}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Flavor */}
        {ending.flavor && (
          <div
            style={{
              position: 'absolute',
              top: 1230,
              left: 0,
              right: 0,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: '0.32em',
                color: 'rgba(212,175,55,0.62)',
                textTransform: 'uppercase',
              }}
            >
              {ending.flavor}
            </div>
          </div>
        )}

        {/* Description */}
        <div
          style={{
            position: 'absolute',
            top: 1320,
            left: 100,
            right: 100,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.62)',
            }}
          >
            {ending.description}
          </div>
        </div>

        {/* Deck name — the story */}
        <div
          style={{
            position: 'absolute',
            bottom: 360,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 26,
              color: 'rgba(255,255,255,0.4)',
              fontStyle: 'italic',
            }}
          >
            de {deckName}
          </div>
        </div>

        {/* Nickname */}
        <div
          style={{
            position: 'absolute',
            bottom: 240,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.82)',
              letterSpacing: '0.08em',
            }}
          >
            {nickname}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 22,
              color: 'rgba(255,255,255,0.38)',
            }}
          >
            jogou esta historia
          </div>
        </div>

        {/* Watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: 90,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.18)',
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
            }}
          >
            MindPractice
          </div>
        </div>
      </div>
    );
  }
);

EndingShareCard.displayName = 'EndingShareCard';
export default EndingShareCard;
