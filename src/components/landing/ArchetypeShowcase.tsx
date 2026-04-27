'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ARCHETYPES } from '@/data/archetypes';
import { getArchetypeAvatarVisual } from '@/lib/archetypeAvatar';

/**
 * Grade visual dos arquétipos. Cada card vira link pra `/a/[id]`
 * com SEO próprio. Hover anima o avatar.
 */
export default function ArchetypeShowcase() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {ARCHETYPES.map((arch, i) => {
        const visual = getArchetypeAvatarVisual(arch);
        return (
          <Link key={arch.id} href={`/a/${arch.id}`} className="block">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-glass p-4 backdrop-blur-md transition-colors hover:border-border-default"
              style={{
                background: `${visual.background}, rgba(255,255,255,0.03)`,
              }}
            >
              {/* Avatar circle */}
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: visual.line,
                  background: visual.background,
                  boxShadow: `0 0 16px ${visual.glow}`,
                }}
              >
                <span
                  className="text-2xl font-bold"
                  style={{ color: visual.accent }}
                >
                  {arch.name.replace(/^O\s+/, '').charAt(0)}
                </span>
              </div>

              <p
                className="mt-3 text-center text-sm font-bold"
                style={{ color: visual.accent }}
              >
                {arch.name}
              </p>
              <p className="mt-0.5 line-clamp-2 text-center text-[10px] italic text-text-tertiary">
                {arch.tagline}
              </p>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
