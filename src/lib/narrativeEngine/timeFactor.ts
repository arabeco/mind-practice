/**
 * Fator de tempo aplicado ao peso da resposta.
 *
 * Curva:
 *   - responseTimeMs = undefined → 1.0 (sem info, neutro)
 *   - responseTimeMs <= 6000ms   → 1.0
 *   - 6000 < responseTimeMs < 12000 → decay linear 1.0 → 0.3
 *   - responseTimeMs >= 12000ms  → 0.3 (clamp)
 *
 * Timeout absoluto (action 'TIMEOUT') não passa por aqui — resposta nem
 * é registrada com peso.
 *
 * Substitui o antigo `timeTempero` (que dava bump de 5% pra resposta rápida).
 * Conviccao vira responsabilidade exclusiva do `intensity` picker.
 */
export function timeFactor(responseTimeMs?: number): number {
  if (responseTimeMs === undefined) return 1.0;
  if (responseTimeMs <= 6000) return 1.0;
  if (responseTimeMs >= 12000) return 0.3;
  const t = (responseTimeMs - 6000) / 6000; // 0..1
  return 1.0 - 0.7 * t;
}
