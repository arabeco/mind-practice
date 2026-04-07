'use client';

import { useEffect, useState } from 'react';
import OnboardingStories from './OnboardingStories';

const ONBOARDING_KEY = 'mindpractice_onboarded';

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    setNeedsOnboarding(!localStorage.getItem(ONBOARDING_KEY));
    setChecked(true);
  }, []);

  if (!checked) return null;
  if (needsOnboarding) return <OnboardingStories onComplete={() => setNeedsOnboarding(false)} />;
  return <>{children}</>;
}
