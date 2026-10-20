'use client';

import { useEffect, useState } from 'react';
import { DebateRoom } from '@/components/debate/debate-room';

export default function DebatePage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Parse transcript from URL search params
        const params = new URLSearchParams(window.location.search);
        const transcriptParam = params.get('transcript');

        if (transcriptParam) {
            try {
                decodeURIComponent(transcriptParam);
                // Just validate it's valid JSON
                JSON.parse(decodeURIComponent(transcriptParam));
            } catch (err) {
                console.error('Failed to parse transcript:', err);
                setError('Failed to load debate transcript');
            }
        } else {
            setError('No debate transcript found');
        }
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent-pro border-t-transparent mx-auto" />
                    <p className="text-muted">Loading debate...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4 max-w-md mx-auto px-4">
                    <div className="h-16 w-16 rounded-full bg-red-900/30 border border-red-800/50 flex items-center justify-center mx-auto">
                        <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold">Unable to Load Debate</h1>
                    <p className="text-muted">{error || 'No debate transcript found in URL'}</p>
                    <a href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-pro text-white font-medium hover:bg-accent-pro-glow transition-colors">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Start New Debate
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <DebateRoom />
        </div>
    );
}