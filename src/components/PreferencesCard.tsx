'use client';

/**
 * Card de preferências — toggles de Som e Vibração (haptics).
 * Persistem via usePresentationPrefs (localStorage mindpractice_presentation_prefs),
 * que é a MESMA fonte lida pelo uiFeedback global e pelo jogo.
 */

import { usePresentationPrefs } from '@/hooks/usePresentationPrefs';
import { feedback } from '@/lib/uiFeedback';

function Toggle({
  on,
  label,
  hint,
  icon,
  onChange,
}: {
  on: boolean;
  label: string;
  hint: string;
  icon: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
    >
      <span className="text-lg" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold text-white/85">{label}</span>
        <span className="block text-[10px] text-white/45">{hint}</span>
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          on ? 'bg-accent-gold/70' : 'bg-white/12'
        }`}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
          style={{ left: on ? '18px' : '2px' }}
        />
      </span>
    </button>
  );
}

export default function PreferencesCard() {
  const { prefs, setSoundEnabled, setHapticsEnabled } = usePresentationPrefs();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5">
      <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/55">
        Preferências
      </p>
      <div className="space-y-2">
        <Toggle
          on={prefs.soundEnabled}
          label="Som"
          hint="Efeitos sonoros e ambiente nas cenas"
          icon={prefs.soundEnabled ? '🔊' : '🔇'}
          onChange={(next) => {
            setSoundEnabled(next);
            if (next) feedback('pop', 'tap'); // toca um som de confirmação ao LIGAR
          }}
        />
        <Toggle
          on={prefs.hapticsEnabled}
          label="Vibração"
          hint="Feedback tátil (haptics) no celular"
          icon="📳"
          onChange={(next) => {
            setHapticsEnabled(next);
            if (next) feedback('tap', 'confirm'); // vibra ao LIGAR pra sentir
          }}
        />
      </div>
    </div>
  );
}
