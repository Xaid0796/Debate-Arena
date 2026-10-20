/**
 * Provider adapter types and interfaces
 */

import { ProviderName } from '@/lib/config/types';
import { GenerateDebateRequestValidated, DebateTranscriptValidated } from '@/lib/debate/types';

export type { ProviderName } from '@/lib/config/types';

export interface ProviderAdapter {
    name: ProviderName;
    generateDebate(request: GenerateDebateRequestValidated, apiKey: string, baseUrl?: string, language?: string): Promise<DebateTranscriptValidated>;
    validateConfig(model: string, apiKey: string, baseUrl?: string): Promise<{ valid: boolean; error?: string }>;
    getDefaultModel(): string;
    getSupportedModels(): string[];
}

export interface ProviderCallOptions {
    model: string;
    apiKey: string;
    baseUrl?: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    userPrompt: string;
    responseFormat?: 'json' | 'text';
}

export interface ProviderResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
}

export const PROVIDER_METADATA = {
    openai: {
        name: 'openai' as ProviderName,
        displayName: 'OpenAI',
        defaultModel: 'gpt-4o-mini',
        supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        requiresBaseUrl: false,
        envVar: 'OPENAI_API_KEY',
    },
    gemini: {
        name: 'gemini' as ProviderName,
        displayName: 'Google Gemini',
        defaultModel: 'gemini-3.1-flash-lite',
        supportedModels: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
        requiresBaseUrl: false,
        envVar: 'GEMINI_API_KEY',
    },
    anthropic: {
        name: 'anthropic' as ProviderName,
        displayName: 'Anthropic',
        defaultModel: 'claude-3-5-sonnet-20241022',
        supportedModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
        requiresBaseUrl: false,
        envVar: 'ANTHROPIC_API_KEY',
    },
    custom: {
        name: 'custom' as ProviderName,
        displayName: 'Custom (OpenAI-compatible)',
        defaultModel: '',
        supportedModels: [],
        requiresBaseUrl: true,
        envVar: 'CUSTOM_API_KEY',
    },
} as const;

export type ProviderMetadata = typeof PROVIDER_METADATA[keyof typeof PROVIDER_METADATA];