'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
  
  const [time, setTime] = useState('12:00:00');
  const [weather, setWeather] = useState('Loading...');
  const [currentCity, setCurrentCity] = useState({
    name: 'Amsterdam',
    country: 'NL',
    lat: 52.3676,
    lon: 4.9041,
    timezone: 'Europe/Amsterdam'
  });
  const [sessionCode, setSessionCode] = useState('000000');
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentVideo, setCurrentVideo] = useState('No video playing');
  const [player, setPlayer] = useState(null);
  const [showControlPanel, setShowControlPanel] = useState(false);

  useEffect(() => {
    function updateTime() {
      const now = new Date();
      try {
        const timeString = now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: currentCity.timezone
        });
        setTime(timeString);
      } catch (error) {
        console.error('Time error:', error);
      }
    }

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [currentCity.timezone]);

  useEffect(() => {
    async function getWeather() {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${currentCity.lat}&lon=${currentCity.lon}&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric`
        );
        const data = await response.json();
        const temp = Math.round(data.main.temp);
        setWeather(`${temp}°C`);
      } catch (error) {
        console.error('Weather error:', error);
        setWeather('N/A');
      }
    }

    getWeather();
    const interval = setInterval(getWeather, 300000);
    return () => clearInterval(interval);
  }, [currentCity.lat, currentCity.lon]);

  async function searchCity(cityName) {
    try {
      const geoResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}`
      );
      const geoData = await geoResponse.json();
      
      if (geoData.length > 0) {
        const city = geoData[0];
        
        const timezoneResponse = await fetch(
          `https://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.NEXT_PUBLIC_TIMEZONE_API_KEY}&format=json&by=position&lat=${city.lat}&lng=${city.lon}`
        );
        const timezoneData = await timezoneResponse.json();

        setCurrentCity({
          name: city.name,
          country: city.country,
          lat: city.lat,
          lon: city.lon,
          timezone: timezoneData.zoneName
        });
      }
    } catch (error) {
      console.error('City search error:', error);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {mode === 'display' ? (
        <div id="displayMode">
          <div id="youtubePlayer"></div>
          <div className="fixed top-0 left-0 p-5 z-10 text-2xl font-bold">{time}</div>
          <div className="fixed top-0 right-0 p-5 z-10">{weather}</div>
          <div className="fixed top-20 left-1/2 -translate-x-1/2 p-5 z-10">{`${currentCity.name}, ${currentCity.country}`}</div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-10 bg-black/80 rounded-2xl text-center">
            <span className="block text-lg mb-5 opacity-80">Session Code</span>
            <div className="text-4xl font-bold">{sessionCode}</div>
          </div>
        </div>
      ) : (
        <div id="controlMode" className="p-5">
          <h1 className="text-2xl mb-5">Control Panel</h1>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Enter session code"
              className="w-full p-2 bg-gray-800 rounded"
              maxLength={6}
              onChange={(e) => {
                if (e.target.value.length <= 6) {
                  setSessionCode(e.target.value);
                }
              }}
            />
            <input 
              type="text" 
              placeholder="Enter city name"
              className="w-full p-2 bg-gray-800 rounded"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  searchCity(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <input 
              type="text" 
              placeholder="Enter YouTube URL"
              className="w-full p-2 bg-gray-800 rounded"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  // We'll add updateYouTubeUrl function later
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}