'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { ScenePresentationProfile, TensionBand } from '@/lib/scenePresentation';

type UiCue = 'phase-enter' | 'hold-confirm' | 'timeout';

type Cleanup = () => void;

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

interface UseSceneAudioParams {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export function useSceneAudio({ soundEnabled, hapticsEnabled }: UseSceneAudioParams) {
  const contextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const unlockedRef = useRef(false);
  const ambienceKeyRef = useRef<string>('');
  const ambienceCleanupRef = useRef<Cleanup | null>(null);

  const ensureContext = useCallback(async () => {
    if (contextRef.current) return contextRef.current;
    if (typeof window === 'undefined') return null;

    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtor) return null;

    const ctx = new AudioCtor();
    const master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);

    contextRef.current = ctx;
    masterGainRef.current = master;
    return ctx;
  }, []);

  const unlock = useCallback(async () => {
    const ctx = await ensureContext();
    if (!ctx) return false;
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    unlockedRef.current = ctx.state === 'running';
    return unlockedRef.current;
  }, [ensureContext]);

  const stopAmbience = useCallback(() => {
    ambienceCleanupRef.current?.();
    ambienceCleanupRef.current = null;
    ambienceKeyRef.current = '';
  }, []);

  const playEnvelopeTone = useCallback(async (
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    duration: number,
    gainAmount: number,
    detune = 0,
  ) => {
    const ctx = await ensureContext();
    const master = masterGainRef.current;
    if (!ctx || !master || !soundEnabled || !unlockedRef.current) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), ctx.currentTime + duration);
    osc.detune.value = detune;

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainAmount, ctx.currentTime + duration * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }, [ensureContext, soundEnabled]);

  const createNoiseLoop = useCallback((ctx: AudioContext, cutoff: number, volume: number): Cleanup => {
    const master = masterGainRef.current;
    if (!master) return () => {};

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();

    return () => {
      try {
        source.stop();
      } catch {}
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }, []);

  const createOscLoop = useCallback((
    ctx: AudioContext,
    type: OscillatorType,
    frequency: number,
    gainAmount: number,
    tremoloHz: number,
    detune = 0,
  ): Cleanup => {
    const master = masterGainRef.current;
    if (!master) return () => {};

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    gain.gain.value = gainAmount;

    lfo.type = 'sine';
    lfo.frequency.value = tremoloHz;
    lfoGain.gain.value = gainAmount * 0.42;

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(master);

    osc.start();
    lfo.start();

    return () => {
      try {
        osc.stop();
        lfo.stop();
      } catch {}
      osc.disconnect();
      gain.disconnect();
      lfo.disconnect();
      lfoGain.disconnect();
    };
  }, []);

  const setAmbience = useCallback(async (
    profile: ScenePresentationProfile,
    tensionBand: TensionBand,
  ) => {
    const ctx = await ensureContext();
    if (!ctx || !soundEnabled || !unlockedRef.current) {
      stopAmbience();
      return;
    }

    const nextKey = `${profile.ambience}:${tensionBand}`;
    if (ambienceKeyRef.current === nextKey) return;

    stopAmbience();

    const cleanups: Cleanup[] = [];
    const intensity =
      tensionBand === 'alta' ? 1 : tensionBand === 'media' ? 0.84 : 0.68;

    switch (profile.ambience) {
      case 'publico':
        cleanups.push(createNoiseLoop(ctx, 1200, 0.02 * intensity));
        cleanups.push(createOscLoop(ctx, 'sine', 148, 0.008 * intensity, 0.12));
        cleanups.push(createOscLoop(ctx, 'triangle', 296, 0.004 * intensity, 0.18));
        break;
      case 'privado':
        cleanups.push(createOscLoop(ctx, 'sine', 92, 0.012 * intensity, 0.08));
        cleanups.push(createNoiseLoop(ctx, 520, 0.01 * intensity));
        break;
      case 'profissional':
        cleanups.push(createOscLoop(ctx, 'triangle', 168, 0.01 * intensity, 0.14));
        cleanups.push(createOscLoop(ctx, 'sine', 336, 0.0032 * intensity, 0.22));
        break;
      case 'digital':
        cleanups.push(createOscLoop(ctx, 'square', 156, 0.004 * intensity, 0.7));
        cleanups.push(createOscLoop(ctx, 'triangle', 624, 0.0025 * intensity, 0.35, -8));
        cleanups.push(createNoiseLoop(ctx, 2600, 0.006 * intensity));
        break;
      case 'ritual':
        cleanups.push(createOscLoop(ctx, 'sawtooth', 73, 0.008 * intensity, 0.09, -6));
        cleanups.push(createOscLoop(ctx, 'triangle', 146, 0.004 * intensity, 0.13, 6));
        cleanups.push(createNoiseLoop(ctx, 400, 0.011 * intensity));
        break;
    }

    ambienceCleanupRef.current = () => {
      cleanups.forEach(cleanup => cleanup());
    };
    ambienceKeyRef.current = nextKey;
  }, [createNoiseLoop, createOscLoop, ensureContext, soundEnabled, stopAmbience]);

  const playUiCue = useCallback(async (cue: UiCue) => {
    if (cue === 'hold-confirm') {
      await playEnvelopeTone('triangle', 420, 760, 0.14, 0.045);
      await playEnvelopeTone('sine', 620, 940, 0.12, 0.02, 6);
      return;
    }

    if (cue === 'timeout') {
      await playEnvelopeTone('sawtooth', 340, 78, 0.24, 0.05);
      await playEnvelopeTone('triangle', 180, 60, 0.16, 0.03, -12);
      return;
    }

    await playEnvelopeTone('sine', 260, 330, 0.11, 0.018);
  }, [playEnvelopeTone]);

  /**
   * Crescendo áudio para FINISH_DECK — três camadas empilhadas:
   * sub grave (corpo), triangle medio (dourado), sine alto (brilho).
   * Curta mas densa — a sensação de "acabei e venci".
   */
  const playDeckTriumph = useCallback(async () => {
    await playEnvelopeTone('triangle', 240, 520, 0.62, 0.06);
    await playEnvelopeTone('sine', 520, 880, 0.48, 0.045, 4);
    await playEnvelopeTone('sine', 880, 1320, 0.34, 0.032, -6);
  }, [playEnvelopeTone]);

  const playEventImpact = useCallback(async (tensionBand: TensionBand) => {
    if (tensionBand === 'alta') {
      await playEnvelopeTone('sawtooth', 250, 62, 0.42, 0.05);
      await playEnvelopeTone('triangle', 110, 44, 0.36, 0.035, -14);
      return;
    }

    if (tensionBand === 'media') {
      await playEnvelopeTone('triangle', 180, 72, 0.3, 0.038);
      await playEnvelopeTone('sine', 420, 240, 0.18, 0.014);
      return;
    }

    await playEnvelopeTone('sine', 140, 72, 0.22, 0.025);
  }, [playEnvelopeTone]);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    navigator.vibrate(pattern);
  }, [hapticsEnabled]);

  useEffect(() => {
    if (!soundEnabled) {
      stopAmbience();
    }
  }, [soundEnabled, stopAmbience]);

  useEffect(() => () => {
    stopAmbience();
    if (contextRef.current) {
      contextRef.current.close().catch(() => {});
    }
  }, [stopAmbience]);

  return {
    unlock,
    setAmbience,
    stopAmbience,
    playEventImpact,
    playDeckTriumph,
    playUiCue,
    vibrate,
  };
}
