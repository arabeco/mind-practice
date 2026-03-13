import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GameProvider } from '@/context/GameContext';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'MindPractice - Simulador de Reatividade Social',
  description: 'Descubra seu arquetipo comportamental atraves de micro-conflitos sob pressao.',
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
        <GameProvider>
          <main className="min-h-screen pb-20">{children}</main>
          <BottomNav />
        </GameProvider>
      </body>
    </html>
  );
}
