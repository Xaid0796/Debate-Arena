/**
 * Preferences persistence utilities
 * Handles localStorage for non-sensitive preferences only
 * API keys are stored separately in localStorage (for local dev) and in-memory (for production)
 */

import { AppPreferences, DEFAULT_PREFERENCES, ProviderConfig } from './types';
import { validateAppPreferences, sanitizeProviderConfig } from './validation';

const STORAGE_KEY = 'ai-debate-arena-preferences';
const STORAGE_VERSION = 1;
const API_KEYS_STORAGE_KEY = 'ai-debate-arena-api-keys';

interface StoredPreferences {
    version: number;
    preferences: AppPreferences;
    updatedAt: number;
}

interface StoredApiKeys {
    [profileId: string]: string;
}

function loadStoredApiKeys(): StoredApiKeys {
    if (typeof window === 'undefined') {
        return {};
    }
    try {
        const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
        if (!stored) return {};
        return JSON.parse(stored);
    } catch {
        return {};
    }
}

function saveStoredApiKeys(apiKeys: StoredApiKeys): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(apiKeys));
    } catch (error) {
        console.error('Failed to save API keys:', error);
    }
}

export function loadPreferences(): AppPreferences {
    if (typeof window === 'undefined') {
        return DEFAULT_PREFERENCES;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return DEFAULT_PREFERENCES;
        }

        const parsed: StoredPreferences = JSON.parse(stored);

        // Version migration if needed
        if (parsed.version !== STORAGE_VERSION) {
            return migratePreferences(parsed);
        }

        // Validate and merge with defaults
        const validated = validateAppPreferences(parsed.preferences);

        // Load stored API keys and merge them into profiles
        const storedApiKeys = loadStoredApiKeys();
        const profilesWithKeys: typeof validated.providerConfig.profiles = {};

        for (const [id, profile] of Object.entries(validated.providerConfig.profiles)) {
            const storedKey = storedApiKeys[id];
            profilesWithKeys[id] = {
                ...profile,
                apiKey: storedKey || profile.apiKey,
            };
        }

        return {
            ...DEFAULT_PREFERENCES,
            ...validated,
            providerConfig: {
                ...validated.providerConfig,
                profiles: profilesWithKeys,
            },
        };
    } catch {
        return DEFAULT_PREFERENCES;
    }
}

export function savePreferences(preferences: AppPreferences): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        // Extract and store API keys separately
        const apiKeysToStore: StoredApiKeys = {};
        for (const [id, profile] of Object.entries(preferences.providerConfig.profiles)) {
            if (profile.apiKey) {
                apiKeysToStore[id] = profile.apiKey;
            }
        }
        saveStoredApiKeys(apiKeysToStore);

        // Sanitize provider config (remove API keys) before storage
        const sanitized = {
            ...preferences,
            providerConfig: sanitizeProviderConfig(preferences.providerConfig),
        };

        const stored: StoredPreferences = {
            version: STORAGE_VERSION,
            preferences: sanitized,
            updatedAt: Date.now(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
        console.error('Failed to save preferences:', error);
    }
}

export function resetPreferences(): void {
    if (typeof window === 'undefined') {
        return;
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(API_KEYS_STORAGE_KEY);
}

function migratePreferences(stored: StoredPreferences): AppPreferences {
    // For now, just return defaults on version mismatch
    // In the future, implement proper migration logic
    return DEFAULT_PREFERENCES;
}

// In-memory API key storage (never persisted)
const memoryApiKeys = new Map<string, string>();

export function setMemoryApiKey(profileId: string, apiKey: string): void {
    memoryApiKeys.set(profileId, apiKey);
}

export function getMemoryApiKey(profileId: string): string | undefined {
    return memoryApiKeys.get(profileId);
}

export function clearMemoryApiKey(profileId: string): void {
    memoryApiKeys.delete(profileId);
}

export function clearAllMemoryApiKeys(): void {
    memoryApiKeys.clear();
}

export function getProviderConfigWithKeys(providerConfig: ProviderConfig): ProviderConfig {
    // Merge stored config with in-memory API keys
    const profilesWithKeys: typeof providerConfig.profiles = {};

    for (const [id, profile] of Object.entries(providerConfig.profiles)) {
        const memoryKey = memoryApiKeys.get(id);
        profilesWithKeys[id] = {
            ...profile,
            apiKey: memoryKey || profile.apiKey,
        };
    }

    return {
        ...providerConfig,
        profiles: profilesWithKeys,
    };
}