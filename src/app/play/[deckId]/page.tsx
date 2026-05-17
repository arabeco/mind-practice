/**
 * /play/[deckId] — server shell. Pré-renderiza estaticamente um path
 * por deck conhecido (via generateStaticParams), permitindo static
 * export pra Capacitor.
 *
 * Toda a lógica fica em `PlayClient.tsx` ('use client').
 */
import { ALL_DECKS } from '@/data/decks/index';
import PlayClient from './PlayClient';

export function generateStaticParams() {
  return ALL_DECKS.map(deck => ({ deckId: deck.deckId }));
}

export default async function PlayPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return <PlayClient deckId={deckId} />;
}
