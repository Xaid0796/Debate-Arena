/**
 * Provider registry - manages all provider adapters
 */

import { ProviderAdapter, ProviderName, ProviderMetadata, PROVIDER_METADATA } from './types';
import { openaiAdapter } from './openai';
import { geminiAdapter } from './gemini';
import { anthropicAdapter } from './anthropic';
import { customAdapter } from './custom';
import { GenerateDebateRequestValidated, DebateTranscriptValidated } from '@/lib/debate/types';

const adapters: Record<ProviderName, ProviderAdapter> = {
    openai: openaiAdapter,
    gemini: geminiAdapter,
    anthropic: anthropicAdapter,
    custom: customAdapter,
};

export function getAdapter(provider: ProviderName): ProviderAdapter {
    const adapter = adapters[provider];
    if (!adapter) {
        throw new Error(`Unknown provider: ${provider}`);
    }
    return adapter;
}

export function getAllProviders(): ProviderMetadata[] {
    return Object.values(PROVIDER_METADATA) as ProviderMetadata[];
}

export function getProviderMetadata(provider: ProviderName): ProviderMetadata {
    return PROVIDER_METADATA[provider];
}

export async function generateDebate(
    request: GenerateDebateRequestValidated,
    apiKey: string,
    baseUrl?: string,
    language?: string
): Promise<DebateTranscriptValidated> {
    const adapter = getAdapter(request.providerConfig.provider as ProviderName);
    return adapter.generateDebate(request, apiKey, baseUrl, language);
}

export async function validateProviderConfig(
    provider: ProviderName,
    model: string,
    apiKey: string,
    baseUrl?: string
): Promise<{ valid: boolean; error?: string }> {
    const adapter = getAdapter(provider);
    return adapter.validateConfig(model, apiKey, baseUrl);
}

export function isValidProvider(provider: string): provider is ProviderName {
    return provider in adapters;
}