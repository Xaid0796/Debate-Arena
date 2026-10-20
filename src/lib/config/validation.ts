/**
 * Validation utilities for configuration and debate requests
 */

import { z } from 'zod';
import { ProviderProfile, ProviderConfig, DebateSettings, AppPreferences } from './types';
import { GenerateDebateRequestSchema } from '@/lib/debate/types';

// Provider profile validation
export const ProviderProfileSchema = z.object({
    id: z.string().min(1).max(100),
    name: z.enum(['openai', 'gemini', 'anthropic', 'custom']),
    displayName: z.string().min(1).max(100),
    apiKey: z.string().optional(),
    modelId: z.string().min(1).max(100),
    baseUrl: z.string().url().optional().or(z.literal('')),
    enabled: z.boolean(),
    isServerManaged: z.boolean(),
});

export const ProviderConfigSchema = z.object({
    profiles: z.record(z.string(), ProviderProfileSchema),
    selectedProviderIds: z.object({
        pro: z.string().nullable(),
        con: z.string().nullable(),
        judge: z.string().nullable(),
        shared: z.string().nullable(),
    }),
    useSharedModel: z.boolean(),
});

export const DebateSettingsSchema = z.object({
    format: z.enum(['standard', 'steelman', 'devils-advocate']),
    rounds: z.number().int().min(1).max(5),
    playbackSpeed: z.number().min(0.25).max(3),
    maxWordsPerMessage: z.number().int().min(20).max(200),
    temperature: z.number().min(0).max(2),
    maxOutputTokens: z.number().int().min(500).max(8000),
    includeCrossExamination: z.boolean(),
    includeEvidence: z.boolean(),
    enableJudge: z.boolean(),
    language: z.string().optional(),
    customInstructions: z.object({
        pro: z.string().max(1000).optional(),
        con: z.string().max(1000).optional(),
        judge: z.string().max(1000).optional(),
    }),
}).transform((data) => ({
    ...data,
    language: data.language || 'English',
}));

export const AppPreferencesSchema = z.object({
    providerConfig: ProviderConfigSchema,
    debateSettings: DebateSettingsSchema,
    ui: z.object({
        theme: z.enum(['dark', 'light', 'system']),
        reducedMotion: z.boolean(),
    }),
});

// Validation functions
export function validateProviderProfile(data: unknown): ProviderProfile {
    return ProviderProfileSchema.parse(data);
}

export function validateProviderConfig(data: unknown): ProviderConfig {
    return ProviderConfigSchema.parse(data);
}

export function validateDebateSettings(data: unknown): DebateSettings {
    return DebateSettingsSchema.parse(data);
}

export function validateAppPreferences(data: unknown): AppPreferences {
    return AppPreferencesSchema.parse(data);
}

export function validateGenerateDebateRequest(data: unknown) {
    return GenerateDebateRequestSchema.safeParse(data);
}

// Safe validation with error handling
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}

// Sanitize provider profile for client-side storage (remove API keys)
export function sanitizeProviderProfile(profile: ProviderProfile): Omit<ProviderProfile, 'apiKey'> & { hasApiKey: boolean } {
    const { apiKey, ...rest } = profile;
    return {
        ...rest,
        hasApiKey: !!apiKey && apiKey.length > 0,
    };
}

// Sanitize provider config for client-side storage
export function sanitizeProviderConfig(config: ProviderConfig): Omit<ProviderConfig, 'profiles'> & { profiles: Record<string, ReturnType<typeof sanitizeProviderProfile>> } {
    return {
        ...config,
        profiles: Object.fromEntries(
            Object.entries(config.profiles).map(([id, profile]) => [id, sanitizeProviderProfile(profile)])
        ),
    };
}