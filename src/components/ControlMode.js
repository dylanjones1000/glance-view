'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ControlMode() {
    const [sessionInput, setSessionInput] = useState('');
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [currentVideo, setCurrentVideo] = useState('No video playing');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdatingVideo, setIsUpdatingVideo] = useState(false);
    const [isUpdatingCity, setIsUpdatingCity] = useState(false);

    // Add cleanup for subscription
    useEffect(() => {
        return () => {
            if (currentSessionId) {
                supabase.removeChannel(`session_${currentSessionId}`);
            }
        };
    }, [currentSessionId]);

    const joinSession = async () => {
        if (sessionInput.length !== 6) {
            setError('Please enter a valid 6-digit session code');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('active_sessions')
                .select()
                .eq('session_id', sessionInput)
                .single();

            if (error) throw error;

            if (data) {
                setCurrentSessionId(sessionInput);
                setError('');
                subscribeToSessionChanges(sessionInput);
                if (data.youtube_url) {
                    setCurrentVideo(data.youtube_url);
                }
            } else {
                setError('Session not found');
            }
        } catch (error) {
            console.error('Error joining session:', error);
            setError('Error joining session');
        } finally {
            setIsLoading(false);
        }
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
                    if (payload.new.youtube_url) {
                        setCurrentVideo(payload.new.youtube_url);
                    }
                }
            )
            .subscribe();

        return channel;
    };

    const updateYouTubeUrl = async (url) => {
        if (!currentSessionId) {
            setError('Please join a session first');
            return;
        }

        setIsUpdatingVideo(true);
        try {
            let videoId = '';
            if (url.includes('youtube.com/watch?v=')) {
                videoId = url.split('v=')[1].split('&')[0];
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0];
            }

            if (!videoId) {
                setError('Invalid YouTube URL');
                return;
            }

            const { error } = await supabase
                .from('active_sessions')
                .update({
                    youtube_url: url,
                    last_updated: new Date().toISOString()
                })
                .eq('session_id', currentSessionId);

            if (error) throw error;
            setCurrentVideo(url);
            setError('');
        } catch (error) {
            console.error('Error updating YouTube URL:', error);
            setError('Error updating video');
        } finally {
            setIsUpdatingVideo(false);
        }
    };

    const handleCitySearch = async (cityName) => {
        if (!currentSessionId) {
            setError('Please join a session first');
            return;
        }

        setIsUpdatingCity(true);
        try {
            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}`
            );
            const data = await response.json();
            
            if (data.length > 0) {
                const city = data[0];
                
                const timezoneResponse = await fetch(
                    `https://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.NEXT_PUBLIC_TIMEZONE_API_KEY}&format=json&by=position&lat=${city.lat}&lng=${city.lon}`
                );
                const timezoneData = await timezoneResponse.json();

                const { error } = await supabase
                    .from('active_sessions')
                    .update({
                        city_name: city.name,
                        city_country: city.country,
                        city_lat: city.lat,
                        city_lon: city.lon,
                        city_timezone: timezoneData.zoneName,
                        last_updated: new Date().toISOString()
                    })
                    .eq('session_id', currentSessionId);

                if (error) throw error;
                setError('');
            }
        } catch (error) {
            console.error('City search error:', error);
            setError('Error updating city');
        } finally {
            setIsUpdatingCity(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-5">
            {!currentSessionId ? (
                <div className="max-w-md mx-auto mt-20">
                    <h1 className="text-2xl mb-8">Join Session</h1>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Enter 6-digit session code"
                            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-gray-500 focus:outline-none"
                            value={sessionInput}
                            onChange={(e) => setSessionInput(e.target.value.slice(0, 6))}
                            maxLength={6}
                        />
                        <button
                            onClick={joinSession}
                            disabled={isLoading}
                            className="w-full p-3 bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Joining...' : 'Join'}
                        </button>
                        {error && (
                            <p className="text-red-500 text-sm">{error}</p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="max-w-md mx-auto">
                    <h1 className="text-2xl mb-8">Control Panel</h1>
                    <div className="space-y-6">
                        <div className="bg-gray-800 p-4 rounded">
                            <h2 className="text-sm text-gray-400 mb-2">Session Code</h2>
                            <p className="text-xl font-bold">{currentSessionId}</p>
                        </div>

                        <div className="bg-gray-800 p-4 rounded">
                            <h2 className="text-sm text-gray-400 mb-2">Currently Playing</h2>
                            <p className="truncate">{currentVideo}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Enter YouTube URL"
                                    className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-gray-500 focus:outline-none"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            updateYouTubeUrl(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                    disabled={isUpdatingVideo}
                                />
                                {isUpdatingVideo && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Enter city name"
                                    className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-gray-500 focus:outline-none"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCitySearch(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                    disabled={isUpdatingCity}
                                />
                                {isUpdatingCity && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <p className="text-red-500 text-sm">{error}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <a 
                href="?mode=display" 
                className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
            >
                Switch to Display Mode
            </a>
        </div>
    );
}