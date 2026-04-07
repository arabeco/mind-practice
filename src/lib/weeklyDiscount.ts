export function getWeeklyDiscountDeckId(): string | null {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const discountable = ['holofote', 'alta_tensao', 'profissional', 'social', 'livro_amaldicoado'];
  return discountable[weekNum % discountable.length];
}

export function getDiscountTimeRemaining(): string {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(0, 0, 0, 0);
  const diff = endOfWeek.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}
