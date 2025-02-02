'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import YouTubePlayer from './YouTubePlayer';

export default function DisplayMode() {
    const [time, setTime] = useState('00:00:00');
    const [weather, setWeather] = useState('Loading...');
    const [currentCity, setCurrentCity] = useState({
        name: 'Amsterdam',
        country: 'NL',
        lat: 52.3676,
        lon: 4.9041,
        timezone: 'Europe/Amsterdam'
    });
    const [sessionCode, setSessionCode] = useState('000000');
    const [videoId, setVideoId] = useState(null);

    useEffect(() => {
        createSession();
        
        const timeInterval = setInterval(updateTime, 1000);
        const weatherInterval = setInterval(getWeather, 300000);
        
        updateTime();
        getWeather();

        return () => {
            clearInterval(timeInterval);
            clearInterval(weatherInterval);
        };
    }, []);

    const updateTime = () => {
        const now = new Date();
        setTime(now.toLocaleTimeString());
    };

    const getWeather = async () => {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${currentCity.lat}&lon=${currentCity.lon}&units=metric&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}`
            );
            const data = await response.json();
            setWeather(`${Math.round(data.main.temp)}°C ${data.weather[0].main}`);
        } catch (error) {
            console.error('Error fetching weather:', error);
            setWeather('Weather unavailable');
        }
    };

    const createSession = async () => {
        const newSessionCode = Math.floor(100000 + Math.random() * 900000).toString();
        try {
            const { data, error } = await supabase
                .from('active_sessions')
                .insert([{
                    session_id: newSessionCode,
                    youtube_url: '',
                    show_time: true,
                    show_weather: true,
                    widget_style: 'dark',
                    city_name: currentCity.name,
                    city_country: currentCity.country,
                    city_lat: currentCity.lat,
                    city_lon: currentCity.lon,
                    city_timezone: currentCity.timezone,
                    created_at: new Date().toISOString(),
                    last_updated: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            
            setSessionCode(newSessionCode);
            subscribeToSessionChanges(newSessionCode);
        } catch (error) {
            console.error('Error creating session:', error);
        }
    };

    const extractVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const subscribeToSessionChanges = (sessionId) => {
        const channel = supabase
            .channel(`session_${sessionId}`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'active_sessions', 
                    filter: `session_id=eq.${sessionId}` 
                },
                (payload) => {
                    console.log('Session update received:', payload);
                    handleSessionUpdate(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleSessionUpdate = (payload) => {
        if (!payload) return;

        // Update video if changed
        if (payload.youtube_url) {
            const newVideoId = extractVideoId(payload.youtube_url);
            if (newVideoId) {
                setVideoId(newVideoId);
            }
        }

        // Update city if changed
        if (payload.city_name && (
            payload.city_name !== currentCity.name ||
            payload.city_country !== currentCity.country
        )) {
            setCurrentCity({
                name: payload.city_name,
                country: payload.city_country,
                lat: payload.city_lat,
                lon: payload.city_lon,
                timezone: payload.city_timezone
            });
        }
    };

    return (
        <div className="relative min-h-screen bg-black text-white">
            {videoId && <YouTubePlayer videoId={videoId} />}
            
            <div className="fixed inset-0 pointer-events-none">
                {/* Time Display */}
                <div className="absolute top-0 left-0 p-5 text-2xl font-bold bg-black/50 backdrop-blur-sm rounded-br">
                    {time}
                </div>

                {/* Weather Display */}
                <div className="absolute top-0 right-0 p-5 text-2xl font-bold bg-black/50 backdrop-blur-sm rounded-bl">
                    {weather}
                </div>

                {/* City Info */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 p-5 text-lg opacity-80 bg-black/50 backdrop-blur-sm rounded">
                    {`${currentCity.name}, ${currentCity.country}`}
                </div>

                {/* Session Code */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-10 bg-black/80 backdrop-blur-sm rounded-2xl text-center">
                    <span className="block text-lg mb-5 opacity-80">Session Code</span>
                    <div className="text-4xl font-bold">{sessionCode}</div>
                </div>
            </div>

            <a 
                href="?mode=control" 
                className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded pointer-events-auto hover:bg-black/70 transition-colors"
            >
                Switch to Control Mode
            </a>
        </div>
    );
}