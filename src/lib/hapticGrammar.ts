/**
 * Gramática tátil centralizada.
 *
 * Padrões em ms (duração ou pares ON/OFF). A ideia: o usuário aprende
 * inconscientemente que cada "pulso" significa uma coisa:
 *
 *   tap          → confirmação leve (uma resposta foi registrada)
 *   confirm      → resposta com convicção (intensidade alta)
 *   qualify      → "mais ou menos" (intensidade baixa)
 *   timeout      → tempo esgotou
 *   scene-impact → evento crítico (tensao ≥ 4)
 *   scene-tap    → toque em cena de tensão média
 *   drift        → arquétipo mudou/consolidou
 *   triumph      → deck completado
 *   milestone    → bônus de streak / desbloqueio
 *   deny         → input inválido
 *
 * Usa `navigator.vibrate` direto — os call-sites passam pelo `vibrate()` do
 * useSceneAudio que respeita a preferência de haptics.
 */

export type HapticPattern = number | number[];

export const HAPTIC_GRAMMAR = {
  tap: 18,
  confirm: [10, 30, 10] as number[],
  qualify: 12,
  timeout: [20, 40, 20] as number[],
  sceneImpactHigh: [20, 32, 16] as number[],
  sceneTap: 16,
  drift: [40, 80, 40] as number[],
  triumph: [28, 60, 28, 60, 80] as number[],
  milestone: [14, 20, 14, 20, 50] as number[],
  deny: [8, 40, 8] as number[],
} as const satisfies Record<string, HapticPattern>;

export type HapticKey = keyof typeof HAPTIC_GRAMMAR;

export function getHaptic(key: HapticKey): HapticPattern {
  return HAPTIC_GRAMMAR[key];
}
