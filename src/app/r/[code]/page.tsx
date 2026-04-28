'use client';

/**
 * /r/[code] — landing de referral. Salva o code no localStorage e
 * redireciona pro / (que mostra landing pública pra captura ou home
 * se já logado).
 *
 * Quando o user finalmente fizer signup, attributeReferralOnSignup()
 * (chamado pelo AuthContext) atribui a referência usando o code.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { rememberReferralCode } from '@/lib/supabase/referrals';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function ReferralLandingPage({ params }: PageProps) {
  const router = useRouter();
  const { code } = use(params);

  useEffect(() => {
    rememberReferralCode(code);
    // Redirect imediato pra root — landing/home decide o que mostrar
    router.replace('/');
  }, [code, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
        <p className="mt-4 text-sm text-text-tertiary">Convite registrado…</p>
      </div>
    </main>
  );
}
