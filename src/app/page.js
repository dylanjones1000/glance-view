'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DisplayMode from '@/components/DisplayMode';
import ControlMode from '@/components/ControlMode';

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'display';

  return (
    <main className="min-h-screen bg-black text-white">
      {mode === 'display' ? <DisplayMode /> : <ControlMode />}
    </main>
  );
}