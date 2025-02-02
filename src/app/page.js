'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Home() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'display';
  const [time, setTime] = useState('12:00:00');

  useEffect(() => {
    function updateTime() {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      setTime(timeString);
    }

    // Update time immediately
    updateTime();
    
    // Update time every second
    const interval = setInterval(updateTime, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      {mode === 'display' ? (
        <div id="displayMode">
          <div id="youtubePlayer"></div>
          <div className="fixed top-0 left-0 p-5 z-10 text-2xl font-bold">{time}</div>
          <div className="fixed top-0 right-0 p-5 z-10">Loading...</div>
          <div className="fixed top-20 left-1/2 -translate-x-1/2 p-5 z-10">Amsterdam, NL</div>
        </div>
      ) : (
        <div id="controlMode" className="p-5">
          <h1 className="text-2xl mb-5">Control Panel</h1>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Enter session code"
              className="w-full p-2 bg-gray-800 rounded"
            />
            <input 
              type="text" 
              placeholder="Enter YouTube URL"
              className="w-full p-2 bg-gray-800 rounded"
            />
          </div>
        </div>
      )}
    </main>
  );
}