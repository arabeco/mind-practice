'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { CURRENT_SEASON_ID } from '@/lib/season';

const tabs = [
  {
    label: 'Home',
    href: '/',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
  },
  {
    label: 'Temporada',
    href: `/campanha/${CURRENT_SEASON_ID}`,
    // livro aberto
    icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
    matchPrefix: '/campanha',
  },
  {
    label: 'Decks',
    href: '/decks',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    isCenter: true,
  },
  {
    label: 'Mundo',
    href: '/mundo',
    // globo + linha horizontal
    icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 4-5.7 4-9s-1.5-6.5-4-9m0 18c-2.5-2.5-4-5.7-4-9s1.5-6.5 4-9M3 12h18',
  },
  {
    label: 'Perfil',
    href: '/perfil',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith('/play') || pathname.startsWith('/resultado')) {
    return null;
  }

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 sm:left-1/2 sm:right-auto sm:w-[32rem] sm:-translate-x-1/2">
      <div className="glass-nav px-1 py-2">
        <div className="flex items-end justify-around gap-0.5">
          {tabs.map((tab) => {
            const isActive = tab.matchPrefix
              ? pathname.startsWith(tab.matchPrefix)
              : tab.href === '/'
                ? pathname === '/'
                : pathname.startsWith(tab.href);

            if (tab.isCenter) {
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="relative -mt-4 flex flex-col items-center gap-1"
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg transition-colors ${
                      isActive
                        ? 'border-accent-cyan-border bg-accent-cyan-bg shadow-cyan-500/25'
                        : 'border-border-default bg-bg-surfaceStrong shadow-black/20'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-6 w-6 ${
                        isActive
                          ? 'text-accent-cyan drop-shadow-[0_0_12px_rgba(103,232,249,0.65)]'
                          : 'text-text-tertiary'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={tab.icon}
                      />
                    </svg>
                  </div>
                  <span
                    className={`text-[11px] font-medium tracking-[0.08em] ${
                      isActive ? 'text-text-primary' : 'text-text-tertiary'
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-[1.2rem] px-1 py-2"
              >
                {isActive && (
                  <>
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-[1.12rem] border border-border-default bg-bg-surfaceStrong"
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 32,
                      }}
                    />
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute left-1/2 top-1 h-1 w-7 -translate-x-1/2 rounded-full bg-accent-cyan shadow-[0_0_18px_rgba(103,232,249,0.85)]"
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  </>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`relative z-10 h-5 w-5 ${
                    isActive
                      ? 'text-accent-cyan drop-shadow-[0_0_12px_rgba(103,232,249,0.65)]'
                      : 'text-text-tertiary'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={tab.icon}
                  />
                </svg>
                <span
                  className={`relative z-10 text-[11px] font-medium tracking-[0.08em] ${
                    isActive ? 'text-text-primary' : 'text-text-tertiary'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
