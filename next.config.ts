import type { NextConfig } from "next";

/**
 * Mobile build (`MOBILE_BUILD=1 next build`) gera static export pra Capacitor
 * empacotar dentro do app. API routes (`/api/*`) NÃO funcionam no app — IAP
 * via RevenueCat envia direto pro Supabase, sem precisar de servidor próprio.
 *
 * Web build (default) mantém todas rotas dinâmicas + API.
 */
const isMobile = process.env.MOBILE_BUILD === '1';

const nextConfig: NextConfig = {
  ...(isMobile
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
