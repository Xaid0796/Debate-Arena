import { NextRequest, NextResponse } from 'next/server';
import { getAllProviders, isValidProvider } from '@/lib/providers/registry';
import { loadPreferences } from '@/lib/config/preferences';

export async function GET(request: NextRequest) {
    try {
        const preferences = loadPreferences();
        const allProviders = getAllProviders();

        const providerStatuses = allProviders.map((metadata) => {
            const providerName = metadata.name;
            const profile = preferences.providerConfig.profiles[providerName];

            // Check if provider has a server-side API key configured
            const hasServerKey = !!process.env[metadata.envVar];

            // Check if user has provided an API key in memory
            const hasUserKey = profile?.apiKey && profile.apiKey.length > 0;

            const isEnabled = profile?.enabled ?? true;
            const isConfigured = isEnabled && (hasServerKey || hasUserKey);

            return {
                name: providerName,
                displayName: metadata.displayName,
                enabled: isEnabled,
                configured: isConfigured,
                hasServerKey,
                hasUserKey,
                defaultModel: metadata.defaultModel,
                supportedModels: metadata.supportedModels,
            };
        });

        return NextResponse.json({
            providers: providerStatuses,
            sharedModelMode: preferences.providerConfig.useSharedModel,
            defaultProvider: preferences.providerConfig.selectedProviderIds.shared,
        });
    } catch (error) {
        console.error('Error fetching provider status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch provider status' },
            { status: 500 }
        );
    }
}