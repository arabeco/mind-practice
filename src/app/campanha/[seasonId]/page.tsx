/**
 * /campanha/[seasonId] — server shell. Pré-renderiza um path por
 * season conhecida pra suportar static export (Capacitor mobile build).
 */
import { SEASONS } from '@/lib/season';
import CampanhaClient from './CampanhaClient';

export function generateStaticParams() {
  return SEASONS.map(s => ({ seasonId: s.id }));
}

export default async function CampanhaPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId } = await params;
  return <CampanhaClient seasonId={seasonId} />;
}
