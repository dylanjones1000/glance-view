'use client';

import { useSearchParams } from 'next/navigation';
import DisplayMode from '@/components/DisplayMode';
import ControlMode from '@/components/ControlMode';

export default function Home() {
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode') || 'display';

    return (
        <main>
            {mode === 'display' ? <DisplayMode /> : <ControlMode />}
        </main>
    );
}