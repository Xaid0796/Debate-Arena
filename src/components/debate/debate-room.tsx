/**
 * Debate Room - Sequential playback of debate transcript
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Play, Pause, SkipForward, FastForward, RotateCcw, Copy, X, ChevronUp,
    MessageSquare, Bot, Scale, Clock, Loader2, AlertCircle
} from 'lucide-react';
import { DebateTranscriptValidated, DebateMessage, Speaker, Phase } from '@/lib/debate/types';
import { createPlaybackEngine, PlaybackState, getVisibleMessages, getProgressInfo } from '@/lib/debate/playback';

const SPEAKER_CONFIG = {
    pro: { label: 'PRO', icon: MessageSquare, color: 'text-accent-pro', bg: 'bg-accent-pro/10', border: 'border-accent-pro/30', glow: 'accent-pro' },
    con: { label: 'CON', icon: Bot, color: 'text-accent-con', bg: 'bg-accent-con/10', border: 'border-accent-con/30', glow: 'accent-con' },
    judge: { label: 'JUDGE', icon: Scale, color: 'text-accent-judge', bg: 'bg-accent-judge/10', border: 'border-accent-judge/30', glow: 'accent-judge' },
} as const;

const PHASE_LABELS: Record<Phase, string> = {
    opening: 'Opening',
    rebuttal: 'Rebuttal',
    counterargument: 'Counterargument',
    'cross-examination': 'Cross-Examination',
    closing: 'Closing',
    verdict: 'Verdict',
};

function DebateMessageCard({ message, isLatest, isCurrent }: {
    message: DebateMessage;
    isLatest: boolean;
    isCurrent: boolean;
}) {
    const config = SPEAKER_CONFIG[message.speaker];
    const Icon = config.icon;
    const isPro = message.speaker === 'pro';
    const isCon = message.speaker === 'con';
    const isJudge = message.speaker === 'judge';

    if (isJudge) {
        return (
            <div className="flex w-full justify-center my-4 sm:my-6">
                <article
                    className={`relative group max-w-2xl w-full ${config.bg} ${config.border} border rounded-2xl p-3.5 sm:p-5 text-center shadow-md ${isLatest ? 'animate-slide-up' : ''
                        } ${isCurrent ? 'ring-2 ring-accent-judge/50' : ''}`}
                >
                    <div className="flex flex-col items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color} ${config.bg} border ${config.border}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap justify-center text-xs">
                            <span className={`font-semibold ${config.color}`}>{config.label}</span>
                            <span className="text-muted px-2 py-0.5 rounded bg-background/50 border border-card-border">
                                {PHASE_LABELS[message.phase]}
                            </span>
                            <span className="text-muted px-2 py-0.5 rounded bg-background/50 border border-card-border">
                                Round {message.round}
                            </span>
                            <span className="text-muted font-mono">{message.wordCount} words</span>
                        </div>
                        <p className="text-foreground/90 leading-relaxed text-sm">{message.text}</p>
                    </div>
                </article>
            </div>
        );
    }

    return (
        <div className={`flex w-full my-2 sm:my-2.5 ${isPro ? 'justify-start' : 'justify-end'}`}>
            <article
                className={`relative group w-full max-w-[92%] sm:max-w-xl lg:max-w-6xl ${config.bg} ${config.border} border rounded-2xl ${isPro ? 'rounded-tl-sm' : 'rounded-tr-sm'
                    } p-3 sm:p-5 transition-all duration-300 shadow-md break-words overflow-hidden ${isLatest ? 'animate-slide-up' : ''
                    } ${isCurrent ? 'ring-2 ring-accent-pro/50' : ''}`}
            >
                <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color} ${config.bg} border ${config.border}`}>
                        <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap text-xs">
                            <span className={`font-semibold ${config.color}`}>{config.label}</span>
                            <span className="text-muted px-1.5 py-0.5 rounded bg-background/50 border border-card-border">
                                {PHASE_LABELS[message.phase]}
                            </span>
                            <span className="text-muted px-1.5 py-0.5 rounded bg-background/50 border border-card-border">
                                R{message.round}
                            </span>
                            <span className="text-muted font-mono">{message.wordCount}w</span>
                        </div>

                        <p className="text-foreground/90 leading-relaxed text-sm text-left">{message.text}</p>
                    </div>
                </div>
            </article>
        </div>
    );
}

function VerdictCard({ verdict, topic, onClose, onNewDebate, onCopyConclusion }: {
    verdict: any;
    topic: string;
    onClose: () => void;
    onNewDebate: () => void;
    onCopyConclusion: () => void;
}) {
    const winnerLabels = {
        pro: 'PRO Wins',
        con: 'CON Wins',
        inconclusive: 'Inconclusive',
    };

    const winnerColors = {
        pro: 'text-accent-pro',
        con: 'text-accent-con',
        inconclusive: 'text-accent-judge',
    };

    const winnerBgs = {
        pro: 'bg-accent-pro/10 border-accent-pro/30',
        con: 'bg-accent-con/10 border-accent-con/30',
        inconclusive: 'bg-accent-judge/10 border-accent-judge/30',
    };

    return (
        <div className="bg-accent-judge/5 border-2 border-accent-judge/30 rounded-xl overflow-hidden animate-fade-in">
            <div className="bg-accent-judge/10 border-b border-accent-judge/30 p-3 sm:p-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-accent-judge-glow flex items-center gap-2">
                    <Scale className="h-6 w-6" />
                    Judge's Verdict
                </h2>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-background/50 transition-colors"
                    aria-label="Close verdict"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Winner Banner */}
                <div className={`text-center p-4 rounded-lg border ${winnerColors[verdict.winner as keyof typeof winnerColors]} ${winnerBgs[verdict.winner as keyof typeof winnerBgs]}`}>
                    <p className="text-2xl font-bold">{winnerLabels[verdict.winner as keyof typeof winnerLabels]}</p>
                    <div className="flex justify-center gap-8 mt-2 text-sm">
                        <span className="text-accent-pro font-mono">PRO: {verdict.proScore}</span>
                        <span className="text-accent-con font-mono">CON: {verdict.conScore}</span>
                    </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-5">
                    {Object.entries(verdict.criteria).map(([key, score]) => {
                        const labels: Record<string, string> = {
                            evidenceQuality: 'Evidence Quality',
                            logicalReasoning: 'Logical Reasoning',
                            rebuttalEffectiveness: 'Rebuttal Effectiveness',
                            responsiveness: 'Responsiveness',
                            clarityRelevance: 'Clarity & Relevance',
                        };
                        const weights: Record<string, number> = {
                            evidenceQuality: 30,
                            logicalReasoning: 25,
                            rebuttalEffectiveness: 20,
                            responsiveness: 15,
                            clarityRelevance: 10,
                        };
                        return (
                            <div key={key} className="bg-card border border-card-border rounded-lg p-3 sm:p-4 text-center">
                                <div className="text-2xl sm:text-3xl font-bold text-accent-judge-glow">{score as number}/10</div>
                                <div className="text-xs text-muted mt-1">{labels[key]}</div>
                                <div className="text-xs text-muted/50 mt-1">{weights[key]}% weight</div>
                            </div>
                        );
                    })}
                </div>

                {/* Key Arguments */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="bg-accent-pro/5 border border-accent-pro/20 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-accent-pro mb-2 flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            Strongest PRO Argument
                        </h3>
                        <p className="text-foreground/80 text-sm">{verdict.strongestProArgument}</p>
                    </div>
                    <div className="bg-accent-con/5 border border-accent-con/20 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-accent-con mb-2 flex items-center gap-1">
                            <Bot className="h-4 w-4" />
                            Strongest CON Argument
                        </h3>
                        <p className="text-foreground/80 text-sm">{verdict.strongestConArgument}</p>
                    </div>
                </div>

                {/* Limitations */}
                {verdict.limitations.length > 0 && (
                    <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            Limitations & Caveats
                        </h3>
                        <ul className="space-y-1 text-sm text-amber-200">
                            {verdict.limitations.map((limitation: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                    <span className="text-amber-400">•</span>
                                    {limitation}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Conclusion */}
                <div className="bg-card border border-card-border rounded-lg p-5 pt-0">
                    <h3 className="text-sm font-semibold text-muted mb-3">Final Conclusion</h3>
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                        <p className="whitespace-pre-wrap">{verdict.conclusion}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-card-border">
                    <button
                        onClick={onCopyConclusion}
                        className="px-4 py-2 bg-card-border text-foreground font-medium rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-2"
                    >
                        <Copy className="h-4 w-4" />
                        Copy Conclusion
                    </button>
                    <button
                        onClick={onNewDebate}
                        className="px-4 py-2 bg-accent-pro/10 border border-accent-pro/30 text-accent-pro font-medium rounded-lg hover:bg-accent-pro/20 transition-colors flex items-center gap-2"
                    >
                        <RotateCcw className="h-4 w-4" />
                        New Debate
                    </button>
                </div>
            </div>
        </div>
    );
}

export function DebateRoom() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [transcript, setTranscript] = useState<DebateTranscriptValidated | null>(null);
    const [playbackState, setPlaybackState] = useState<PlaybackState>({
        phase: 'idle',
        transcript: null,
        currentMessageIndex: -1,
        playbackSpeed: 1,
        error: null,
        isGenerating: false,
    });
    const [showVerdict, setShowVerdict] = useState(false);
    const engineRef = useRef<ReturnType<typeof createPlaybackEngine> | null>(null);
    const transcriptRef = useRef<DebateTranscriptValidated | null>(null);
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    // Initialize playback engine
    useEffect(() => {
        const engine = createPlaybackEngine(1.0, setPlaybackState);
        engineRef.current = engine;

        return () => {
            engine.destroy();
        };
    }, []);

    // Load transcript from URL params
    useEffect(() => {
        const transcriptParam = searchParams.get('transcript');
        if (transcriptParam) {
            try {
                const parsed = JSON.parse(decodeURIComponent(transcriptParam)) as DebateTranscriptValidated;
                setTranscript(parsed);
                transcriptRef.current = parsed;
                setShowVerdict(false); // Reset verdict when new debate is loaded
                engineRef.current?.start(parsed);
            } catch {
                console.error('Failed to parse transcript from URL');
            }
        }
    }, [searchParams]);

    // Handle playback state changes
    const handlePlay = useCallback(() => engineRef.current?.play(), []);
    const handlePause = useCallback(() => engineRef.current?.pause(), []);
    const handleNext = useCallback(() => engineRef.current?.next(), []);
    const handleSkipToEnd = useCallback(() => engineRef.current?.skipToEnd(), []);
    const handleRestart = useCallback(() => engineRef.current?.restart(), []);
    const handleSpeedChange = useCallback((speed: number) => engineRef.current?.setSpeed(speed), []);

    // Toggle verdict display
    const toggleVerdict = useCallback(() => {
        if (playbackState.phase === 'completed' && transcript) {
            setShowVerdict(!showVerdict);
        }
    }, [playbackState.phase, transcript, showVerdict]);

    // Copy transcript to clipboard
    const copyTranscript = useCallback(async () => {
        if (!transcript) return;

        const text = transcript.messages.map(m =>
            `[${PHASE_LABELS[m.phase]} R${m.round}] ${SPEAKER_CONFIG[m.speaker].label}: ${m.text}`
        ).join('\n\n') + '\n\n--- VERDICT ---\n' + transcript.verdict.conclusion;

        await navigator.clipboard.writeText(text);
    }, [transcript]);

    // Copy just the conclusion
    const copyConclusion = useCallback(async () => {
        if (!transcript) return;
        await navigator.clipboard.writeText(transcript.verdict.conclusion);
    }, [transcript]);

    // Navigate back to setup
    const handleNewDebate = useCallback(() => {
        router.push('/');
        router.refresh();
    }, [router]);

    const visibleMessages = transcript ? getVisibleMessages(transcript, playbackState.currentMessageIndex) : [];
    const progress = transcript ? getProgressInfo(transcript, playbackState.currentMessageIndex) : null;
    const isPlaying = playbackState.phase === 'playing';
    const isGenerating = playbackState.isGenerating;

    if (!transcript) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Loader2 className="h-12 w-12 animate-spin text-accent-pro mb-4" />
                <h2 className="text-2xl font-semibold">Loading debate...</h2>
                <p className="text-muted mt-2">Preparing the debate transcript for playback</p>
            </div>
        );
    }

    const currentMessage = transcript.messages[playbackState.currentMessageIndex];
    const isVerdictPhase = currentMessage?.speaker === 'judge' && currentMessage?.phase === 'verdict';

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header with topic and metadata */}
            <div className="bg-card border border-card-border rounded-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">{transcript.topic}</h1>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted">
                            <span className="flex items-center gap-1 px-2 py-1 bg-accent-pro/10 text-accent-pro rounded-full">
                                <span className="font-medium">{transcript.format}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {transcript.rounds} rounds
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageSquare className="h-3.5 w-3.5" />
                                {transcript.messages.length} messages
                            </span>
                            <span className="font-mono">{transcript.providerUsed}: {transcript.modelUsed}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={copyTranscript}
                            className="px-3 py-2 text-xs sm:text-sm font-medium text-muted hover:text-foreground flex items-center gap-2 rounded-lg hover:bg-card-border transition-colors"
                        >
                            <Copy className="h-4 w-4" />
                            <span className="hidden sm:inline">Copy Transcript</span>
                            <span className="sm:hidden">Copy</span>
                        </button>
                        <button
                            onClick={handleNewDebate}
                            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-muted hover:text-foreground flex items-center gap-2 rounded-lg border border-card-border hover:bg-card-border transition-colors"
                        >
                            <RotateCcw className="h-4 w-4" />
                            <span className="hidden sm:inline">New Debate</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                {progress && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted">
                                {playbackState.phase === 'generating' ? 'Generating debate...' :
                                    playbackState.phase === 'ready' ? 'Ready to play' :
                                        playbackState.phase === 'playing' ? `Playing: ${progress.current} of ${progress.total}` :
                                            playbackState.phase === 'paused' ? `Paused at ${progress.current} of ${progress.total}` :
                                                playbackState.phase === 'completed' ? 'Playback complete' : 'Idle'}
                            </span>
                            <span className="font-mono text-foreground">
                                {playbackState.phase !== 'generating' && playbackState.phase !== 'idle' && playbackState.phase !== 'error'
                                    ? `${Math.round(progress.percentage)}%` : ''}
                            </span>
                        </div>
                        <div className="h-2 bg-card-border rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent-pro transition-all duration-300 ease-out"
                                style={{ width: `${progress.percentage}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted">
                            <span>Round {progress.currentRound}</span>
                            <span>{PHASE_LABELS[progress.currentPhase as keyof typeof PHASE_LABELS]}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Debate messages */}
            <div className="w-full px-0.5 sm:px-2 lg:px-3 space-y-2 sm:space-y-3" id="debate-messages">
                {visibleMessages.map((message, index) => (
                    <DebateMessageCard
                        key={message.id}
                        message={message}
                        isLatest={index === visibleMessages.length - 1}
                        isCurrent={playbackState.phase === 'playing' && index === visibleMessages.length - 1}
                    />
                ))}

                {playbackState.phase === 'playing' && visibleMessages.length > 0 && (
                    <div className="flex items-center justify-center py-4" aria-live="polite">
                        <div className="flex items-center gap-2 text-muted text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Next argument coming up...</span>
                        </div>
                    </div>
                )}

                {playbackState.phase === 'completed' && !showVerdict && transcript.enableJudge && (
                    <div className="text-center py-8 animate-fade-in">
                        <button
                            onClick={toggleVerdict}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-judge/10 border border-accent-judge/30 text-accent-judge-glow font-semibold rounded-lg hover:bg-accent-judge/20 transition-colors"
                        >
                            <Scale className="h-5 w-5" />
                            Reveal Judge's Verdict
                        </button>
                        <p className="text-sm text-muted mt-2">Click to see the independent judge's scoring and conclusion</p>
                    </div>
                )}

                {/* Verdict Display */}
                {showVerdict && transcript.enableJudge && (
                    <VerdictCard
                        verdict={transcript.verdict}
                        topic={transcript.topic}
                        onClose={() => setShowVerdict(false)}
                        onNewDebate={handleNewDebate}
                        onCopyConclusion={copyConclusion}
                    />
                )}
            </div>

            {/* Playback Controls */}
            {(playbackState.phase === 'playing' || playbackState.phase === 'paused' || playbackState.phase === 'ready' || playbackState.phase === 'completed') && (
                <div className="bg-card border border-card-border rounded-xl p-3 sm:p-4 sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm safe-bottom">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                            {playbackState.phase === 'playing' ? (
                                <button onClick={handlePause} className="px-3 sm:px-4 py-2 bg-accent-con/10 border border-accent-con/30 text-accent-con font-medium rounded-lg hover:bg-accent-con/20 transition-colors flex items-center gap-2 text-sm" aria-label="Pause">
                                    <Pause className="h-4 w-4" />
                                    Pause
                                </button>
                            ) : playbackState.phase === 'paused' || playbackState.phase === 'ready' ? (
                                <button onClick={handlePlay} className="px-3 sm:px-4 py-2 bg-accent-pro/10 border border-accent-pro/30 text-accent-pro font-medium rounded-lg hover:bg-accent-pro/20 transition-colors flex items-center gap-2 text-sm" aria-label="Play">
                                    <Play className="h-4 w-4" />
                                    Play
                                </button>
                            ) : null}

                            {(playbackState.phase === 'playing' || playbackState.phase === 'paused') && (
                                <>
                                    <button onClick={handleNext} className="px-3 sm:px-4 py-2 bg-card-border text-foreground font-medium rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-2 text-sm" aria-label="Next message">
                                        <SkipForward className="h-4 w-4" />
                                        Next
                                    </button>
                                    <button onClick={handleSkipToEnd} className="px-3 sm:px-4 py-2 bg-card-border text-foreground font-medium rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-2 text-sm" aria-label="Skip to end">
                                        <FastForward className="h-4 w-4" />
                                        <span className="hidden sm:inline">Skip to End</span>
                                        <span className="sm:hidden">End</span>
                                    </button>
                                </>
                            )}

                            {playbackState.phase === 'completed' && (
                                <button onClick={handleRestart} className="px-3 sm:px-4 py-2 bg-accent-judge/10 border border-accent-judge/30 text-accent-judge font-medium rounded-lg hover:bg-accent-judge/20 transition-colors flex items-center gap-2 text-sm" aria-label="Replay debate">
                                    <RotateCcw className="h-4 w-4" />
                                    Replay
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xs sm:text-sm text-muted">Speed:</span>
                            <select
                                value={playbackState.playbackSpeed}
                                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                                className="bg-background border border-card-border rounded-lg px-2 sm:px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent cursor-pointer"
                            >
                                {speeds.map(s => (
                                    <option key={s} value={s}>{s}x</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {playbackState.phase === 'error' && (
                <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-6 text-center">
                    <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-red-300 mb-2">Error</h3>
                    <p className="text-red-200 mb-4">{playbackState.error}</p>
                    <button
                        onClick={handleRestart}
                        className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-300 font-medium rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
}