import type { MetadataRoute } from 'next';
import { ARCHETYPES } from '@/data/archetypes';

export const dynamic = 'force-static';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mindpractice.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const archetypePages: MetadataRoute.Sitemap = ARCHETYPES.map(a => ({
    url: `${SITE_URL}/a/${a.id}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    ...archetypePages,
  ];
}
