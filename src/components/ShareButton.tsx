'use client';

import { useRef, useCallback, useState } from 'react';
import html2canvas from 'html2canvas';
import ShareCard from './ShareCard';
import type { Archetype, StatKey } from '@/types/game';

interface ShareButtonProps {
  archetype: Archetype;
  axes: Record<StatKey, number>;
  nickname: string;
  /** Compact icon-only mode for toolbars */
  compact?: boolean;
}

export default function ShareButton({ archetype, axes, nickname, compact }: ShareButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleShare = useCallback(async () => {
    if (!cardRef.current || generating) return;
    setGenerating(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        width: 1080,
        height: 1920,
        scale: 1,
        backgroundColor: '#0a0a0f',
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/png')
      );

      if (!blob) {
        setGenerating(false);
        return;
      }

      const file = new File([blob], 'mindpractice-archetype.png', { type: 'image/png' });

      // Try native share with file support
      if (
        typeof navigator !== 'undefined' &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `Eu sou ${archetype.name} — MindPractice`,
        });
      } else {
        // Fallback: download as PNG
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindpractice-archetype.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // User cancelled share or other error — silently ignore
      console.warn('Share failed:', err);
    } finally {
      setGenerating(false);
    }
  }, [archetype, generating]);

  return (
    <>
      {/* Hidden off-screen render target */}
      <div
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          pointerEvents: 'none',
          opacity: 0,
        }}
        aria-hidden="true"
      >
        <ShareCard ref={cardRef} archetype={archetype} axes={axes} nickname={nickname} />
      </div>

      {/* Share button */}
      <button
        type="button"
        onClick={handleShare}
        disabled={generating}
        title="Compartilhar arquetipo"
        className={
          compact
            ? 'flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/60 backdrop-blur-sm transition-colors hover:text-white/90 disabled:opacity-50'
            : 'glass-pill inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-white/60 transition-all hover:border-white/20 hover:text-white/80 disabled:opacity-50'
        }
      >
        {generating ? (
          <svg className={compact ? 'h-3.5 w-3.5 animate-spin' : 'h-4 w-4 animate-spin'} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
        {!compact && 'Compartilhar'}
      </button>
    </>
  );
}
