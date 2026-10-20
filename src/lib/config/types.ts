/**
 * Core configuration types for the AI Debate Arena
 */

export type ProviderName = 'openai' | 'gemini' | 'anthropic' | 'custom';

export interface ProviderProfile {
    id: string;
    name: ProviderName;
    displayName: string;
    apiKey?: string;
    modelId: string;
    baseUrl?: string;
    enabled: boolean;
    isServerManaged: boolean;
}

export interface ProviderConfig {
    profiles: Record<string, ProviderProfile>;
    selectedProviderIds: {
        pro: string | null;
        con: string | null;
        judge: string | null;
        shared: string | null;
    };
    useSharedModel: boolean;
}

export type DebateFormat = 'standard' | 'steelman' | 'devils-advocate';

export interface DebateSettings {
    format: DebateFormat;
    rounds: number;
    playbackSpeed: number;
    maxWordsPerMessage: number;
    temperature: number;
    maxOutputTokens: number;
    includeCrossExamination: boolean;
    includeEvidence: boolean;
    enableJudge: boolean;
    language: string;
    customInstructions: {
        pro?: string;
        con?: string;
        judge?: string;
    };
}

export interface AppPreferences {
    providerConfig: ProviderConfig;
    debateSettings: DebateSettings;
    ui: {
        theme: 'dark' | 'light' | 'system';
        reducedMotion: boolean;
    };
}

export const DEFAULT_DEBATE_SETTINGS: DebateSettings = {
    format: 'standard',
    rounds: 3,
    playbackSpeed: 1.0,
    maxWordsPerMessage: 90,
    temperature: 0.7,
    maxOutputTokens: 4000,
    includeCrossExamination: false,
    includeEvidence: false,
    enableJudge: true,
    language: 'English',
    customInstructions: {},
};

export const DEFAULT_PREFERENCES: AppPreferences = {
    providerConfig: {
        profiles: {},
        selectedProviderIds: {
            pro: null,
            con: null,
            judge: null,
            shared: null,
        },
        useSharedModel: true,
    },
    debateSettings: DEFAULT_DEBATE_SETTINGS,
    ui: {
        theme: 'dark',
        reducedMotion: false,
    },
};