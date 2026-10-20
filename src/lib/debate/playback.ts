/**
 * Debate playback engine - handles sequential message reveal
 */

import { DebateTranscriptValidated, DebateMessage } from './types';

export type PlaybackPhase = 'idle' | 'generating' | 'ready' | 'playing' | 'paused' | 'completed' | 'error';

export interface PlaybackState {
    phase: PlaybackPhase;
    transcript: DebateTranscriptValidated | null;
    currentMessageIndex: number;
    playbackSpeed: number;
    error: string | null;
    isGenerating: boolean;
}

export interface PlaybackControls {
    start: (transcript: DebateTranscriptValidated) => void;
    play: () => void;
    pause: () => void;
    next: () => void;
    skipToEnd: () => void;
    restart: () => void;
    setSpeed: (speed: number) => void;
    setError: (error: string | null) => void;
    setGenerating: (generating: boolean) => void;
    destroy: () => void;
}

type PlaybackCallback = (state: PlaybackState) => void;

export function createPlaybackEngine(
    initialSpeed: number = 1.0,
    onStateChange: PlaybackCallback
): PlaybackControls {
    let state: PlaybackState = {
        phase: 'idle',
        transcript: null,
        currentMessageIndex: 0,
        playbackSpeed: initialSpeed,
        error: null,
        isGenerating: false,
    };

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const notify = () => {
        if (isMounted) {
            onStateChange({ ...state });
        }
    };

    const clearTimer = () => {
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
    };

    const calculateDelay = (message: DebateMessage): number => {
        // Base delay: 1.5 seconds per message + 50ms per word
        const baseDelay = 1500;
        const wordDelay = message.wordCount * 50;
        const totalDelay = (baseDelay + wordDelay) / state.playbackSpeed;
        // Clamp between 500ms and 10 seconds
        return Math.max(500, Math.min(10000, totalDelay));
    };

    const advanceToNext = () => {
        if (!state.transcript || state.currentMessageIndex >= state.transcript.messages.length - 1) {
            // Reached the end
            state.phase = 'completed';
            clearTimer();
            notify();
            return;
        }

        state.currentMessageIndex++;
        notify();

        // Schedule next message
        if (state.phase === 'playing' && state.currentMessageIndex < state.transcript.messages.length) {
            const nextMessage = state.transcript.messages[state.currentMessageIndex];
            const delay = calculateDelay(nextMessage);
            timerId = setTimeout(advanceToNext, delay);
        }
    };

    const controls: PlaybackControls = {
        start: (transcript: DebateTranscriptValidated) => {
            clearTimer();
            state = {
                ...state,
                phase: 'ready',
                transcript,
                currentMessageIndex: 0,
                error: null,
                isGenerating: false,
            };
            notify();

            // Auto-start playback after a brief moment
            setTimeout(() => {
                if (isMounted && state.phase === 'ready') {
                    controls.play();
                }
            }, 500);
        },

        play: () => {
            if (!state.transcript || state.phase === 'generating') return;

            if (state.phase === 'completed') {
                // Restart from beginning
                state.currentMessageIndex = 0;
            }

            state.phase = 'playing';
            notify();

            const currentMessage = state.transcript.messages[state.currentMessageIndex];
            const delay = calculateDelay(currentMessage);
            timerId = setTimeout(advanceToNext, delay);
        },

        pause: () => {
            if (state.phase !== 'playing') return;
            state.phase = 'paused';
            clearTimer();
            notify();
        },

        next: () => {
            if (!state.transcript) return;
            clearTimer();
            advanceToNext();
        },

        skipToEnd: () => {
            if (!state.transcript) return;
            clearTimer();
            state.currentMessageIndex = state.transcript.messages.length - 1;
            state.phase = 'completed';
            notify();
        },

        restart: () => {
            if (!state.transcript) return;
            clearTimer();
            state.currentMessageIndex = 0;
            state.phase = 'ready';
            notify();

            setTimeout(() => {
                if (isMounted && state.phase === 'ready') {
                    controls.play();
                }
            }, 500);
        },

        setSpeed: (speed: number) => {
            state.playbackSpeed = Math.max(0.25, Math.min(3, speed));
            notify();
        },

        setError: (error: string | null) => {
            clearTimer();
            state.error = error;
            state.phase = error ? 'error' : 'idle';
            state.isGenerating = false;
            notify();
        },

        setGenerating: (generating: boolean) => {
            state.isGenerating = generating;
            if (generating) {
                state.phase = 'generating';
                state.error = null;
            }
            notify();
        },

        destroy: () => {
            isMounted = false;
            clearTimer();
        },
    };

    return controls;
}

// Helper to get visible messages up to current index
export function getVisibleMessages(transcript: DebateTranscriptValidated | null, currentIndex: number): DebateMessage[] {
    if (!transcript) return [];
    return transcript.messages.slice(0, currentIndex + 1);
}

// Helper to get progress info
export function getProgressInfo(transcript: DebateTranscriptValidated | null, currentIndex: number): {
    current: number;
    total: number;
    percentage: number;
    currentRound: number;
    currentPhase: string;
} {
    if (!transcript || transcript.messages.length === 0) {
        return { current: 0, total: 0, percentage: 0, currentRound: 1, currentPhase: '' };
    }

    const currentMessage = transcript.messages[Math.min(currentIndex, transcript.messages.length - 1)];
    return {
        current: currentIndex + 1,
        total: transcript.messages.length,
        percentage: ((currentIndex + 1) / transcript.messages.length) * 100,
        currentRound: currentMessage.round,
        currentPhase: currentMessage.phase,
    };
}