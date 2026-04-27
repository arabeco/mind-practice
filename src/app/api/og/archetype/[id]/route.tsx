/**
 * GET /api/og/archetype/[id]
 *
 * Gera PNG 1200×630 (Open Graph standard) com avatar + nome + tagline
 * do arquétipo. Usado em meta tags de /a/[id] pra share preview lindo.
 *
 * Powered by next/og (lightweight, edge-compatible).
 */
import { ImageResponse } from 'next/og';
import { ARCHETYPES } from '@/data/archetypes';
import { getArchetypeAvatarVisual } from '@/lib/archetypeAvatar';

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const archetype = ARCHETYPES.find(a => a.id === id);
  if (!archetype) {
    return new Response('Not found', { status: 404 });
  }

  const visual = getArchetypeAvatarVisual(archetype);
  const initial = archetype.name.replace(/^O\s+/, '').charAt(0);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          backgroundImage: `radial-gradient(ellipse at center, ${visual.glow} 0%, transparent 60%)`,
          fontFamily: 'sans-serif',
          color: 'rgba(255,255,255,0.95)',
          padding: '60px',
        }}
      >
        {/* Avatar circle */}
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: '50%',
            border: `4px solid ${visual.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: visual.background,
            boxShadow: `0 0 80px ${visual.glow}`,
            fontSize: 120,
            fontWeight: 900,
            color: visual.accent,
          }}
        >
          {initial}
        </div>

        {/* Name */}
        <div
          style={{
            marginTop: 40,
            fontSize: 80,
            fontWeight: 900,
            color: visual.accent,
            textShadow: `0 0 40px ${visual.glow}`,
          }}
        >
          {archetype.name}
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.70)',
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          "{archetype.tagline}"
        </div>

        {/* Brand */}
        <div
          style={{
            marginTop: 60,
            fontSize: 18,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.40)',
          }}
        >
          MindPractice
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
