'use client';

import { useEffect, useState } from 'react';
import type { AvatarVariant } from '@/lib/archetypeAvatar';

const NICKNAME_KEY = 'mindpractice_nickname';
const VARIANT_KEY = 'mindpractice_avatar_variant';

/**
 * Lê nickname + avatarVariant do localStorage e re-renderiza quando
 * outras partes do app alteram esses valores (via storage event).
 *
 * Fonte única de verdade pra exibir perfil em múltiplos lugares
 * (card compacto, /perfil, etc).
 */
export function useLocalProfile() {
  const [nickname, setNickname] = useState('Jogador');
  const [variant, setVariant] = useState<AvatarVariant>('masculino');

  useEffect(() => {
    const readFromStorage = () => {
      try {
        const n = localStorage.getItem(NICKNAME_KEY);
        if (n) setNickname(n);
        const v = localStorage.getItem(VARIANT_KEY);
        if (v === 'masculino' || v === 'feminino') setVariant(v);
      } catch {}
    };
    readFromStorage();

    // Sincroniza se outra aba/página alterar
    const onStorage = (e: StorageEvent) => {
      if (e.key === NICKNAME_KEY && e.newValue) setNickname(e.newValue);
      if (e.key === VARIANT_KEY && (e.newValue === 'masculino' || e.newValue === 'feminino')) {
        setVariant(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);

    // Re-lê ao voltar pra tab (caso /perfil tenha atualizado)
    const onFocus = () => readFromStorage();
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { nickname, variant };
}

/** Fórmula de nível: 20 respostas calibram 1 nível. */
export function computeLevel(totalResponses: number): { level: number; xpInLevel: number; xpForNext: number } {
  const xpPerLevel = 20;
  const level = Math.floor(totalResponses / xpPerLevel) + 1;
  const xpInLevel = totalResponses % xpPerLevel;
  return { level, xpInLevel, xpForNext: xpPerLevel };
}
