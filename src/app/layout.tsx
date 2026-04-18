import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { GameProvider } from '@/context/GameContext';
import BottomNav from '@/components/BottomNav';
import OnboardingGate from '@/components/OnboardingGate';
import DevTools from '@/components/DevTools';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'MindPractice - Simulador de Reatividade Social',
  description: 'Descubra seu arquetipo comportamental atraves de micro-conflitos sob pressao.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MindPractice',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <DevTools />
        <ServiceWorkerRegistrar />
        <AuthProvider>
          <GameProvider>
            <OnboardingGate>
              <main className="min-h-screen pb-20">{children}</main>
              <BottomNav />
            </OnboardingGate>
          </GameProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
