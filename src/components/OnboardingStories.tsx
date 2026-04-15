'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

interface OnboardingStoriesProps {
  onComplete: () => void;
}

const slides = [
  {
    title: 'Situacoes reais.',
    subtitle: 'Reacoes suas.',
    description: 'Cenarios do dia a dia que testam como voce reage sob pressao.',
    gradient: 'from-cyan-500/20 via-transparent to-transparent',
    accent: 'text-cyan-400',
  },
  {
    title: 'Cada escolha',
    subtitle: 'revela quem voce e.',
    description: '5 eixos comportamentais. Nenhuma resposta certa. So a sua.',
    gradient: 'from-purple-500/20 via-transparent to-transparent',
    accent: 'text-purple-400',
  },
  {
    title: 'Descubra seu',
    subtitle: 'arquetipo.',
    description: '15 perfis possiveis. O seu muda conforme voce joga.',
    gradient: 'from-amber-500/20 via-transparent to-transparent',
    accent: 'text-amber-400',
    isFinal: true,
  },
];

const ONBOARDING_KEY = 'mindpractice_onboarded';

export default function OnboardingStories({ onComplete }: OnboardingStoriesProps) {
  const [current, setCurrent] = useState(0);
  const router = useRouter();

  const slide = slides[current];

  function finish(navigateTo: string) {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
    router.push(navigateTo);
  }

  function advance() {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0f]">
      {/* Skip button */}
      <button
        onClick={() => finish('/')}
        className="absolute top-6 right-6 z-10 text-white/30 text-xs"
      >
        Pular
      </button>

      {/* Slide area */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={advance}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="flex flex-col items-center text-center px-8"
          >
            {/* Background gradient */}
            <div
              className={`absolute inset-0 bg-gradient-to-b ${slide.gradient} pointer-events-none`}
            />

            <h1 className="text-3xl font-bold text-white relative z-10">
              {slide.title}
            </h1>
            <h2 className={`text-3xl font-bold ${slide.accent} relative z-10 mt-1`}>
              {slide.subtitle}
            </h2>
            <p className="text-sm text-white/50 mt-4 max-w-xs relative z-10">
              {slide.description}
            </p>

            {/* CTA on final slide */}
            {slide.isFinal && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  finish('/');
                }}
                className="mt-8 px-8 py-3 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium backdrop-blur-sm hover:bg-cyan-500/30 transition-colors relative z-10"
              >
                Entrar
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2 z-10">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === current ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
