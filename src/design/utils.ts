import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn(...inputs) — concatena classes com clsx e resolve conflitos
 * Tailwind via twMerge. Padrão idiomático para componentes com cva.
 *
 * @example
 *   cn('px-2 py-1', condition && 'bg-red-500', 'px-4')
 *   // => 'py-1 bg-red-500 px-4'  (px-2 substituído por px-4)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
