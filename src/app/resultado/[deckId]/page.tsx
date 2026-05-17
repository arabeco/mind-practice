/**
 * /resultado/[deckId] — server shell. Pré-renderiza um path por deck
 * conhecido pra suportar static export (Capacitor mobile build).
 */
import { ALL_DECKS } from '@/data/decks/index';
import ResultadoClient from './ResultadoClient';

export function generateStaticParams() {
  return ALL_DECKS.map(deck => ({ deckId: deck.deckId }));
}

export default async function ResultadoPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return <ResultadoClient deckId={deckId} />;
}
