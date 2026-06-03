'use client';

/**
 * uiFeedback — "suco" global da UI (som + haptic) fora da tela de jogo.
 *
 * Por que existe: o useSceneAudio cria um AudioContext por página e só funciona
 * dentro da run. Pra celebrar no /resultado, no claim diário, etc, precisamos
 * de UM contexto global que:
 *   - destrava no 1º gesto do usuário em QUALQUER tela (autoplay policy)
 *   - sintetiza cues curtos (sem arquivos)
 *   - respeita as prefs (mindpractice_presentation_prefs: soundEnabled/hapticsEnabled)
 *
 * Tudo é no-op no servidor e degrada sem quebrar.
 */

import { HAPTIC_GRAMMAR, type HapticPattern } from '@/lib/hapticGrammar';

const PREFS_KEY = 'mindpractice_presentation_prefs';

function readPrefs(): { sound: boolean; haptics: boolean } {
  if (typeof window === 'undefined') return { sound: false, haptics: true };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { sound: false, haptics: true };
    const p = JSON.parse(raw) as { soundEnabled?: boolean; hapticsEnabled?: boolean };
    return { sound: p.soundEnabled ?? false, haptics: p.hapticsEnabled ?? true };
  } catch {
    return { sound: false, haptics: true };
  }
}

// ---- AudioContext singleton ------------------------------------------------
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;
let listenersBound = false;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);
  return ctx;
}

function tryUnlock() {
  const c = ensureCtx();
  if (!c) return;
  if (c.state !== 'running') c.resume().then(() => { unlocked = c.state === 'running'; }).catch(() => {});
  else unlocked = true;
}

/** Liga o destravamento global no 1º gesto. Chamar uma vez (ex: no layout). */
export function initUiFeedback() {
  if (typeof window === 'undefined' || listenersBound) return;
  listenersBound = true;
  const onGesture = () => tryUnlock();
  window.addEventListener('pointerdown', onGesture, { passive: true });
  window.addEventListener('keydown', onGesture, { passive: true });
  window.addEventListener('touchstart', onGesture, { passive: true });
}

// ---- Síntese de tom --------------------------------------------------------
function tone(type: OscillatorType, f0: number, f1: number, dur: number, gain: number, delay = 0) {
  const c = ctx;
  if (!c || !master || !unlocked) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  osc.onended = () => { osc.disconnect(); g.disconnect(); };
}

export type UiCue = 'coin' | 'coinChain' | 'claim' | 'success' | 'tap' | 'pop';

/** Toca um cue sonoro (no-op se som desligado ou contexto não destravado). */
export function playCue(cue: UiCue) {
  if (!readPrefs().sound) return;
  if (!ensureCtx()) return;
  if (!unlocked) tryUnlock();
  switch (cue) {
    case 'coin':
      tone('triangle', 880, 1180, 0.10, 0.05);
      tone('sine', 1320, 1660, 0.08, 0.025, 0.02);
      break;
    case 'coinChain': // várias moedinhas em cascata
      for (let i = 0; i < 5; i++) {
        tone('triangle', 760 + i * 90, 1100 + i * 90, 0.09, 0.04, i * 0.07);
      }
      break;
    case 'claim':
      tone('triangle', 520, 840, 0.12, 0.05);
      tone('sine', 840, 1180, 0.14, 0.03, 0.06);
      break;
    case 'success': // fanfarra leve (resultado/level)
      tone('triangle', 380, 560, 0.16, 0.055);
      tone('sine', 620, 900, 0.18, 0.04, 0.05);
      tone('sine', 940, 1320, 0.16, 0.03, 0.12);
      break;
    case 'pop':
      tone('sine', 440, 720, 0.07, 0.04);
      break;
    case 'tap':
      tone('sine', 300, 360, 0.05, 0.02);
      break;
  }
}

/** Dispara vibração (respeita hapticsEnabled). Aceita chave da gramática ou padrão cru. */
export function haptic(pattern: keyof typeof HAPTIC_GRAMMAR | HapticPattern) {
  if (!readPrefs().haptics) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  const p = typeof pattern === 'string' ? HAPTIC_GRAMMAR[pattern] : pattern;
  navigator.vibrate(p);
}

/** Conveniência: som + haptic juntos. */
export function feedback(cue: UiCue, hap: keyof typeof HAPTIC_GRAMMAR | HapticPattern) {
  playCue(cue);
  haptic(hap);
}
