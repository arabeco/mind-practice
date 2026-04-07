'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const tabs = [
  {
    label: 'Home',
    href: '/',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
  },
  {
    label: 'Decks',
    href: '/decks',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    isCenter: true,
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
            const isActive =
              tab.href === '/'
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
                        ? 'border-cyan-400/60 bg-cyan-500/20 shadow-cyan-500/25'
                        : 'border-white/16 bg-white/[0.08] shadow-black/20'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-6 w-6 ${
                        isActive
                          ? 'text-cyan-300 drop-shadow-[0_0_12px_rgba(103,232,249,0.65)]'
                          : 'text-white/55'
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
                      isActive ? 'text-white' : 'text-white/48'
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
                      className="absolute inset-0 rounded-[1.12rem] border border-white/16 bg-white/[0.08]"
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 32,
                      }}
                    />
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute left-1/2 top-1 h-1 w-7 -translate-x-1/2 rounded-full bg-cyan-300/90 shadow-[0_0_18px_rgba(103,232,249,0.85)]"
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
                      ? 'text-cyan-300 drop-shadow-[0_0_12px_rgba(103,232,249,0.65)]'
                      : 'text-white/55'
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
                    isActive ? 'text-white' : 'text-white/48'
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
