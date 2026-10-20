/**
 * Debate Setup Screen - Configure and start a new debate
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle, HelpCircle, Zap, Brain, Scale, MessageSquare, Globe } from 'lucide-react';
import { loadPreferences } from '@/lib/config/preferences';
import { ProviderProfile, DebateSettings, AppPreferences, DEFAULT_DEBATE_SETTINGS } from '@/lib/config/types';
import { getAllProviders, getProviderMetadata } from '@/lib/providers/registry';

const EXAMPLE_TOPICS = [
    'Should AI replace human teachers?',
    'Is universal basic income economically viable?',
    'Should social media platforms be regulated as public utilities?',
    'Is nuclear energy essential for fighting climate change?',
    'Should gene editing be allowed for human enhancement?',
    'Will remote work become the permanent norm?',
    'Should cryptocurrency be banned?',
    'Is space exploration worth the cost?',
];

const FORMAT_OPTIONS = [
    { value: 'standard', label: 'Standard', description: 'Both sides defend their positions and challenge opposing arguments directly' },
    { value: 'steelman', label: 'Steelman', description: 'Each debater fairly summarizes the strongest version of the opposing argument before rebutting' },
    { value: 'devils-advocate', label: "Devil's Advocate", description: 'Each debater actively challenges assumptions and tests the opposing position' },
] as const;

export function DebateSetup() {
    const router = useRouter();
    const [topic, setTopic] = useState('');
    const [format, setFormat] = useState<DebateSettings['format']>('standard');
    const [rounds, setRounds] = useState(3);
    const [language, setLanguage] = useState<string>('English');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<AppPreferences | null>(null);
    const [configStatus, setConfigStatus] = useState<'checking' | 'ready' | 'incomplete'>('checking');

    useEffect(() => {
        const prefs = loadPreferences();
        setPreferences(prefs);
        checkConfiguration(prefs);
    }, []);

    const checkConfiguration = (prefs: AppPreferences) => {
        const { providerConfig } = prefs;
        const { profiles, selectedProviderIds, useSharedModel } = providerConfig;

        const validProfiles = Object.entries(profiles).filter(
            ([_, p]) => p.enabled && (p.apiKey || p.isServerManaged)
        );

        if (validProfiles.length === 0) {
            setConfigStatus('incomplete');
            return;
        }

        if (useSharedModel) {
            const sharedId = selectedProviderIds.shared;
            const sharedProfile = sharedId ? profiles[sharedId] : null;
            if (sharedProfile && sharedProfile.enabled && (sharedProfile.apiKey || sharedProfile.isServerManaged)) {
                setConfigStatus('ready');
                return;
            }
            if (validProfiles.length > 0) {
                setConfigStatus('ready');
                return;
            }
        } else {
            const proProfile = selectedProviderIds.pro ? profiles[selectedProviderIds.pro] : null;
            const conProfile = selectedProviderIds.con ? profiles[selectedProviderIds.con] : null;
            const judgeProfile = selectedProviderIds.judge ? profiles[selectedProviderIds.judge] : null;

            if (proProfile?.enabled && conProfile?.enabled && judgeProfile?.enabled &&
                (proProfile.apiKey || proProfile.isServerManaged) &&
                (conProfile.apiKey || conProfile.isServerManaged) &&
                (judgeProfile.apiKey || judgeProfile.isServerManaged)) {
                setConfigStatus('ready');
                return;
            }
            if (validProfiles.length >= 1) {
                setConfigStatus('ready');
                return;
            }
        }
        setConfigStatus('incomplete');
    };

    const getSelectedModelLabel = (): string => {
        if (!preferences) return 'Not configured';

        const { providerConfig } = preferences;
        const { profiles, selectedProviderIds, useSharedModel } = providerConfig;

        if (useSharedModel) {
            const profile = selectedProviderIds.shared ? profiles[selectedProviderIds.shared] : null;
            if (profile) return `${getProviderDisplayName(profile.name)}: ${profile.modelId}`;
            return 'Shared model not selected';
        } else {
            const proProfile = selectedProviderIds.pro ? profiles[selectedProviderIds.pro] : null;
            const conProfile = selectedProviderIds.con ? profiles[selectedProviderIds.con] : null;
            const judgeProfile = selectedProviderIds.judge ? profiles[selectedProviderIds.judge] : null;

            const parts = [];
            if (proProfile) parts.push(`PRO: ${getProviderDisplayName(proProfile.name)} (${proProfile.modelId})`);
            if (conProfile) parts.push(`CON: ${getProviderDisplayName(conProfile.name)} (${conProfile.modelId})`);
            if (judgeProfile) parts.push(`JUDGE: ${getProviderDisplayName(judgeProfile.name)} (${judgeProfile.modelId})`);
            return parts.join(' | ') || 'Models not selected';
        }
    };

    const getProviderDisplayName = (name: string): string => {
        const metadata = getProviderMetadata(name as any);
        return metadata?.displayName || name;
    };

    const validateForm = (): boolean => {
        if (!topic.trim()) {
            setError('Please enter a debate topic');
            return false;
        }
        if (topic.trim().length < 5) {
            setError('Topic must be at least 5 characters');
            return false;
        }
        if (configStatus === 'incomplete') {
            setError('Please configure providers in Settings first');
            return false;
        }
        setError(null);
        return true;
    };

    const handleStartDebate = async () => {
        if (!validateForm()) return;

        setIsGenerating(true);
        setError(null);

        try {
            const prefs = loadPreferences();
            const { providerConfig, debateSettings } = prefs;
            const { profiles, selectedProviderIds, useSharedModel } = providerConfig;

            // Build provider config for API
            let apiProviderConfig;
            let roleModels;

            const validProfiles = Object.entries(profiles).filter(
                ([_, p]) => p.enabled && (p.apiKey || p.isServerManaged)
            );

            if (validProfiles.length === 0) {
                throw new Error('Please configure at least one provider with an API key in Settings');
            }

            if (useSharedModel) {
                const sharedId = selectedProviderIds.shared && profiles[selectedProviderIds.shared] && (profiles[selectedProviderIds.shared].apiKey || profiles[selectedProviderIds.shared].isServerManaged)
                    ? selectedProviderIds.shared
                    : validProfiles[0][0];

                const profile = profiles[sharedId];
                apiProviderConfig = {
                    provider: profile.name,
                    model: profile.modelId,
                    apiKey: profile.apiKey,
                    baseUrl: profile.baseUrl,
                };
            } else {
                const proId = selectedProviderIds.pro && profiles[selectedProviderIds.pro] && (profiles[selectedProviderIds.pro].apiKey || profiles[selectedProviderIds.pro].isServerManaged)
                    ? selectedProviderIds.pro
                    : validProfiles[0][0];

                const conId = selectedProviderIds.con && profiles[selectedProviderIds.con] && (profiles[selectedProviderIds.con].apiKey || profiles[selectedProviderIds.con].isServerManaged)
                    ? selectedProviderIds.con
                    : (validProfiles[1]?.[0] || validProfiles[0][0]);

                const judgeId = selectedProviderIds.judge && profiles[selectedProviderIds.judge] && (profiles[selectedProviderIds.judge].apiKey || profiles[selectedProviderIds.judge].isServerManaged)
                    ? selectedProviderIds.judge
                    : (validProfiles[2]?.[0] || validProfiles[0][0]);

                const proProfile = profiles[proId];
                const conProfile = profiles[conId];
                const judgeProfile = profiles[judgeId];

                apiProviderConfig = {
                    provider: proProfile.name,
                    model: proProfile.modelId,
                    apiKey: proProfile.apiKey,
                    baseUrl: proProfile.baseUrl,
                };

                roleModels = {
                    pro: { provider: proProfile.name, model: proProfile.modelId, apiKey: proProfile.apiKey, baseUrl: proProfile.baseUrl },
                    con: { provider: conProfile.name, model: conProfile.modelId, apiKey: conProfile.apiKey, baseUrl: conProfile.baseUrl },
                    judge: { provider: judgeProfile.name, model: judgeProfile.modelId, apiKey: judgeProfile.apiKey, baseUrl: judgeProfile.baseUrl },
                };
            }

            const response = await fetch('/api/debate/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic.trim(),
                    format,
                    rounds,
                    language,
                    maxWordsPerMessage: debateSettings.maxWordsPerMessage,
                    temperature: debateSettings.temperature,
                    maxOutputTokens: debateSettings.maxOutputTokens,
                    includeCrossExamination: debateSettings.includeCrossExamination,
                    includeEvidence: debateSettings.includeEvidence,
                    enableJudge: debateSettings.enableJudge,
                    customInstructions: debateSettings.customInstructions,
                    providerConfig: apiProviderConfig,
                    roleModels,
                    useSharedModel,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate debate');
            }

            // Navigate to debate room with transcript
            router.push(`/debate?transcript=${encodeURIComponent(JSON.stringify(data))}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExampleTopic = (example: string) => {
        setTopic(example);
        setError(null);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
            <div className="text-center space-y-3 sm:space-y-4">
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">Start a New Debate</h1>
                <p className="text-muted text-sm sm:text-lg max-w-2xl mx-auto px-2">
                    Configure your topic, choose a format, and watch AI models debate with structured arguments and independent judging.
                </p>
            </div>

            {configStatus === 'incomplete' && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-900/30 border border-amber-800/50">
                    <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    <div className="text-sm text-amber-300">
                        <span className="font-medium">Configuration incomplete.</span>
                        <a href="/settings" className="underline hover:text-amber-200 ml-1">Configure providers in Settings</a> to enable debate generation.
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-900/30 border border-red-800/50 animate-fade-in">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-300">{error}</p>
                </div>
            )}

            <div className="space-y-6">
                <div className="bg-card border border-card-border rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-accent-pro" />
                        Debate Topic
                    </h2>

                    <textarea
                        value={topic}
                        onChange={(e) => { setTopic(e.target.value); setError(null); }}
                        placeholder="Enter your debate topic (e.g., 'Should AI replace human teachers?')"
                        rows={3}
                        className="w-full bg-background border border-card-border rounded-lg px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent resize-none transition-colors"
                        maxLength={200}
                    />

                    <div className="flex items-center justify-between text-sm text-muted">
                        <span>{topic.length}/200 characters</span>
                        <span className="font-mono">{topic.trim().split(/\s+/).filter(Boolean).length} words</span>
                    </div>

                    <div className="pt-2 border-t border-card-border">
                        <p className="text-sm text-muted mb-3">Or choose an example:</p>
                        <div className="flex flex-wrap gap-2">
                            {EXAMPLE_TOPICS.map((example) => (
                                <button
                                    key={example}
                                    type="button"
                                    onClick={() => handleExampleTopic(example)}
                                    className="px-3 py-2 sm:py-1.5 text-xs text-muted hover:text-foreground hover:bg-card-border rounded-full border border-card-border transition-colors"
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-card-border rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Scale className="h-5 w-5 text-accent-judge" />
                        Debate Format
                    </h2>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {FORMAT_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setFormat(option.value)}
                                className={`relative p-4 rounded-lg border-2 transition-all text-left ${format === option.value
                                    ? 'border-accent-pro bg-accent-pro/5'
                                    : 'border-card-border hover:border-accent-pro/50'
                                    }`}
                            >
                                <div className="font-medium text-foreground">{option.label}</div>
                                <div className="text-sm text-muted mt-1">{option.description}</div>
                                {format === option.value && (
                                    <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-accent-pro" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-card border border-card-border rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Globe className="h-5 w-5 text-accent-judge" />
                        Debate Language
                    </h2>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                    >
                        {['English', 'Hinglish'].map((lang) => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-card border border-card-border rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Brain className="h-5 w-5 text-accent-con" />
                        Rounds & Model
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium mb-2">Number of Rounds</label>
                            <select
                                value={rounds}
                                onChange={(e) => setRounds(Number(e.target.value))}
                                className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                            >
                                {[2, 3, 4, 5].map((r) => (
                                    <option key={r} value={r}>{r} rounds</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Current Model Configuration</label>
                            <div className="bg-background border border-card-border rounded-lg px-4 py-3 text-sm text-muted font-mono min-h-[48px] flex items-center">
                                {getSelectedModelLabel()}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-card-border">
                        <p className="text-sm text-muted">
                            <strong>Playback speed:</strong> {preferences?.debateSettings.playbackSpeed || 1}x &nbsp;|&nbsp;
                            <strong>Max words/message:</strong> {preferences?.debateSettings.maxWordsPerMessage || 90} &nbsp;|&nbsp;
                            <strong>Temperature:</strong> {preferences?.debateSettings.temperature || 0.7}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleStartDebate}
                    disabled={isGenerating || configStatus === 'incomplete'}
                    className="w-full py-3 sm:py-4 px-6 rounded-lg bg-accent-pro text-white font-semibold text-base sm:text-lg flex items-center justify-center gap-3 hover:bg-accent-pro-glow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Generating debate...
                        </>
                    ) : (
                        <>
                            <Zap className="h-5 w-5" />
                            Start Debate
                        </>
                    )}
                </button>

                <p className="text-center text-sm text-muted">
                    Debate will be generated in a single request, then played back message by message.
                </p>
            </div>
        </div>
    );
}