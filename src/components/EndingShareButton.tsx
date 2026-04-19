'use client';

import { useRef, useCallback, useState } from 'react';
import html2canvas from 'html2canvas';
import EndingShareCard from './EndingShareCard';
import type { CampaignEnding } from '@/types/game';

interface EndingShareButtonProps {
  ending: CampaignEnding;
  seasonLabel: string;
  deckName: string;
  nickname: string;
}

export default function EndingShareButton({
  ending,
  seasonLabel,
  deckName,
  nickname,
}: EndingShareButtonProps) {
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

      const fileName = `mindpractice-${ending.id}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (
        typeof navigator !== 'undefined' &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `Terminei — ${ending.title}`,
          text: `${ending.tagline} — MindPractice`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.warn('Share failed:', err);
    } finally {
      setGenerating(false);
    }
  }, [ending, generating]);

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
        <EndingShareCard
          ref={cardRef}
          ending={ending}
          seasonLabel={seasonLabel}
          deckName={deckName}
          nickname={nickname}
        />
      </div>

      <button
        type="button"
        onClick={handleShare}
        disabled={generating}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-accent-gold/40 bg-gradient-to-b from-amber-400/15 to-amber-700/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-100 shadow-[0_0_22px_rgba(212,175,55,0.22)] transition hover:brightness-110 disabled:opacity-50"
      >
        {generating ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
          </svg>
        )}
        {generating ? 'Gerando...' : 'Compartilhar final'}
      </button>
    </>
  );
}
