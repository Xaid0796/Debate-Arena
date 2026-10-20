'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Settings, Save, RotateCcw, Eye, EyeOff, CheckCircle, AlertCircle,
    Plus, Trash2, Zap, Brain, Scale, MessageSquare, Bot, Key, Lock,
    ChevronDown, ChevronUp, TestTube, SlidersHorizontal, Globe, Server,
    Shield, Info, Bell, Palette, Monitor, HelpCircle, Loader2, ArrowLeft
} from 'lucide-react';
import {
    loadPreferences,
    savePreferences,
    resetPreferences,
} from '@/lib/config/preferences';
import {
    AppPreferences,
    DEFAULT_PREFERENCES,
    DEFAULT_DEBATE_SETTINGS,
    ProviderProfile,
    DebateSettings,
    ProviderName,
} from '@/lib/config/types';
import { getAllProviders, getProviderMetadata, isValidProvider, validateProviderConfig } from '@/lib/providers/registry';

const FORMAT_OPTIONS = [
    { value: 'standard', label: 'Standard', description: 'Both sides defend their positions and challenge opposing arguments directly' },
    { value: 'steelman', label: 'Steelman', description: 'Each debater fairly summarizes the strongest version of the opposing argument before rebutting' },
    { value: 'devils-advocate', label: "Devil's Advocate", description: 'Each debater actively challenges assumptions and tests the opposing position' },
] as const;

const SPEAKER_CONFIG = {
    pro: { label: 'PRO', icon: MessageSquare, color: 'text-accent-pro', bg: 'bg-accent-pro/10', border: 'border-accent-pro/30' },
    con: { label: 'CON', icon: Bot, color: 'text-accent-con', bg: 'bg-accent-con/10', border: 'border-accent-con/30' },
    judge: { label: 'JUDGE', icon: Scale, color: 'text-accent-judge', bg: 'bg-accent-judge/10', border: 'border-accent-judge/30' },
} as const;

type ActiveSection = 'providers' | 'api-keys' | 'models' | 'roles' | 'debate' | 'advanced';

export default function SettingsPage() {
    const router = useRouter();
    const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
    const [activeSection, setActiveSection] = useState<ActiveSection>('providers');
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [testingProvider, setTestingProvider] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, { valid: boolean; error?: string }>>({});
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

    // Load preferences on mount
    useEffect(() => {
        const prefs = loadPreferences();
        setPreferences(prefs);
    }, []);

    // Handle save with debounced status reset
    const handleSave = useCallback(async () => {
        setSaving(true);
        setSaveStatus('idle');
        try {
            savePreferences(preferences);
            setSaveStatus('success');
        } catch (err) {
            console.error('Failed to save preferences:', err);
            setSaveStatus('error');
        } finally {
            setSaving(false);
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    }, [preferences]);

    const handleReset = useCallback(() => {
        if (confirm('Reset all settings to defaults? This will clear all provider configurations and API keys.')) {
            resetPreferences();
            setPreferences(DEFAULT_PREFERENCES);
            setTestResults({});
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    }, []);

    const handleTestProvider = useCallback(async (providerId: string) => {
        const profile = preferences.providerConfig.profiles[providerId];
        if (!profile) return;

        setTestingProvider(providerId);
        try {
            const apiKey = profile.apiKey || '';
            const result = await validateProviderConfig(profile.name, profile.modelId, apiKey, profile.baseUrl);
            setTestResults(prev => ({ ...prev, [providerId]: result }));
        } finally {
            setTestingProvider(null);
        }
    }, [preferences.providerConfig.profiles]);

    const handleApiKeyChange = useCallback((providerId: string, value: string) => {
        setPreferences(prev => ({
            ...prev,
            providerConfig: {
                ...prev.providerConfig,
                profiles: {
                    ...prev.providerConfig.profiles,
                    [providerId]: {
                        ...prev.providerConfig.profiles[providerId],
                        apiKey: value,
                    },
                },
            },
        }));
    }, []);

    const handleAddProvider = useCallback((providerName: ProviderName) => {
        const metadata = getProviderMetadata(providerName);
        const newId = `${providerName}-${Date.now()}`;
        const newProfile: ProviderProfile = {
            id: newId,
            name: providerName,
            displayName: metadata.displayName,
            apiKey: '',
            modelId: metadata.defaultModel,
            baseUrl: providerName === 'custom' ? '' : undefined,
            enabled: true,
            isServerManaged: false,
        };

        setPreferences(prev => ({
            ...prev,
            providerConfig: {
                ...prev.providerConfig,
                profiles: {
                    ...prev.providerConfig.profiles,
                    [newId]: newProfile,
                },
            },
        }));
        setExpandedProviders(prev => ({ ...prev, [newId]: true }));
    }, []);

    const handleRemoveProvider = useCallback((providerId: string) => {
        setPreferences(prev => {
            const newProfiles = { ...prev.providerConfig.profiles };
            delete newProfiles[providerId];

            // Clear selections if they reference this provider
            const newSelected = { ...prev.providerConfig.selectedProviderIds };
            Object.keys(newSelected).forEach(key => {
                if (newSelected[key as keyof typeof newSelected] === providerId) {
                    newSelected[key as keyof typeof newSelected] = null;
                }
            });

            return {
                ...prev,
                providerConfig: {
                    ...prev.providerConfig,
                    profiles: newProfiles,
                    selectedProviderIds: newSelected,
                },
            };
        });
    }, []);

    const handleProfileChange = useCallback((providerId: string, field: keyof ProviderProfile, value: any) => {
        setPreferences(prev => ({
            ...prev,
            providerConfig: {
                ...prev.providerConfig,
                profiles: {
                    ...prev.providerConfig.profiles,
                    [providerId]: {
                        ...prev.providerConfig.profiles[providerId],
                        [field]: value,
                    },
                },
            },
        }));
    }, []);

    const handleSelectionChange = useCallback((role: keyof AppPreferences['providerConfig']['selectedProviderIds'], providerId: string | null) => {
        setPreferences(prev => ({
            ...prev,
            providerConfig: {
                ...prev.providerConfig,
                selectedProviderIds: {
                    ...prev.providerConfig.selectedProviderIds,
                    [role]: providerId,
                },
            },
        }));
    }, []);

    const handleSharedModelToggle = useCallback((enabled: boolean) => {
        setPreferences(prev => ({
            ...prev,
            providerConfig: {
                ...prev.providerConfig,
                useSharedModel: enabled,
            },
        }));
    }, []);

    const handleDebateSettingChange = useCallback(<K extends keyof DebateSettings>(key: K, value: DebateSettings[K]) => {
        setPreferences(prev => ({
            ...prev,
            debateSettings: {
                ...prev.debateSettings,
                [key]: value,
            },
        }));
    }, []);

    const handleCustomInstructionChange = useCallback((role: 'pro' | 'con' | 'judge', value: string) => {
        setPreferences(prev => ({
            ...prev,
            debateSettings: {
                ...prev.debateSettings,
                customInstructions: {
                    ...prev.debateSettings.customInstructions,
                    [role]: value,
                },
            },
        }));
    }, []);

    // Compute available profiles for each role
    const getAvailableProfiles = useCallback((excludeRole?: keyof AppPreferences['providerConfig']['selectedProviderIds']) => {
        const { profiles, selectedProviderIds, useSharedModel } = preferences.providerConfig;
        const enabledProfiles = Object.entries(profiles).filter(([, p]) => p.enabled);

        if (useSharedModel) {
            return enabledProfiles;
        }

        if (excludeRole) {
            const otherRoles = Object.entries(selectedProviderIds)
                .filter(([k]) => k !== excludeRole)
                .map(([, v]) => v)
                .filter(Boolean);
            return enabledProfiles.filter(([id]) => !otherRoles.includes(id));
        }

        return enabledProfiles;
    }, [preferences.providerConfig]);

    const getProviderDisplayName = useCallback((name: ProviderName) => {
        return getProviderMetadata(name).displayName;
    }, []);

    const getSupportedModels = useCallback((providerName: ProviderName) => {
        return getProviderMetadata(providerName).supportedModels;
    }, []);

    // Check if any provider is configured
    const hasConfiguredProvider = Object.values(preferences.providerConfig.profiles).some(
        p => p.enabled && (p.apiKey || p.isServerManaged)
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 bg-accent-pro/10 rounded-xl">
                        <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-accent-pro" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
                        <p className="text-muted text-sm sm:text-base">Configure providers, models, and debate behavior</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <button
                        onClick={() => router.push('/')}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-muted hover:text-foreground flex items-center gap-2 rounded-lg border border-card-border hover:bg-card-border transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Back to Debate</span>
                        <span className="sm:hidden">Back</span>
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-muted hover:text-foreground flex items-center gap-2 rounded-lg border border-card-border hover:bg-card-border transition-colors"
                    >
                        <RotateCcw className="h-4 w-4" />
                        <span className="hidden sm:inline">Reset to Defaults</span>
                        <span className="sm:hidden">Reset</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-accent-pro rounded-lg hover:bg-accent-pro-glow transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Save Status Toast */}
            {saveStatus === 'success' && (
                <div className="fixed top-4 right-4 z-50 animate-slide-down bg-green-900/30 border border-green-800/50 text-green-300 px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg">
                    <CheckCircle className="h-5 w-5" />
                    Settings saved successfully
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="bg-card border border-card-border rounded-xl p-1.5 sm:p-2">
                <nav className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5" role="tablist" aria-label="Settings sections">
                    {[
                        { id: 'providers', label: 'Providers', icon: Server, desc: 'Enable/disable LLM providers' },
                        { id: 'api-keys', label: 'API Keys', icon: Key, desc: 'Configure API keys for each provider' },
                        { id: 'models', label: 'Models', icon: Brain, desc: 'Select models for each provider' },
                        { id: 'roles', label: 'Role Assignments', icon: Scale, desc: 'Assign models to PRO, CON, JUDGE' },
                        { id: 'debate', label: 'Debate Settings', icon: MessageSquare, desc: 'Format, rounds, playback, limits' },
                        { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal, desc: 'Temperature, tokens, custom instructions' },
                    ].map(({ id, label, icon: Icon, desc }) => (
                        <button
                            key={id}
                            role="tab"
                            aria-selected={activeSection === id}
                            onClick={() => setActiveSection(id as ActiveSection)}
                            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all flex-1 sm:flex-initial justify-center sm:justify-start ${activeSection === id
                                ? 'bg-accent-pro/10 text-accent-pro'
                                : 'text-muted hover:text-foreground hover:bg-card-border'
                                }`}
                        >
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                            <span className="font-medium text-xs sm:text-base truncate">{label}</span>
                            <span className="text-xs text-muted hidden lg:block">{desc}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Section Content */}
            <div className="space-y-6">
                {/* 1. Provider Selection */}
                {activeSection === 'providers' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-card border border-card-border rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Server className="h-5 w-5 text-accent-pro" />
                                Provider Selection
                            </h2>
                            <p className="text-muted mb-6">Enable or disable LLM providers. At least one provider must be configured to run debates.</p>

                            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                                {getAllProviders().map((metadata) => {
                                    const profile = Object.values(preferences.providerConfig.profiles).find(p => p.name === metadata.name);
                                    const hasServerKey = !!process.env[metadata.envVar];
                                    const isExpanded = expandedProviders[profile?.id || ''];

                                    return (
                                        <div key={metadata.name} className="bg-background border border-card-border rounded-xl p-5 relative group">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-card-border">
                                                        <Globe className="h-5 w-5 text-foreground" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold">{metadata.displayName}</h3>
                                                        <p className="text-xs text-muted">{metadata.name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {profile && (
                                                        <button
                                                            onClick={() => setExpandedProviders(prev => ({ ...prev, [profile.id]: !isExpanded }))}
                                                            className="p-1 rounded hover:bg-card-border transition-colors"
                                                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                                        >
                                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Status Indicators */}
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {hasServerKey && (
                                                    <span className="px-2 py-0.5 text-xs bg-green-900/30 text-green-300 border border-green-800/50 rounded-full flex items-center gap-1">
                                                        <Shield className="h-3 w-3" />
                                                        Server Key
                                                    </span>
                                                )}
                                                {profile?.apiKey && (
                                                    <span className="px-2 py-0.5 text-xs bg-blue-900/30 text-blue-300 border border-blue-800/50 rounded-full flex items-center gap-1">
                                                        <Key className="h-3 w-3" />
                                                        User Key
                                                    </span>
                                                )}
                                                {profile && !hasServerKey && !profile.apiKey && (
                                                    <span className="px-2 py-0.5 text-xs bg-amber-900/30 text-amber-300 border border-amber-800/50 rounded-full flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Not Configured
                                                    </span>
                                                )}
                                            </div>

                                            {/* Expandable Details */}
                                            {profile && isExpanded && (
                                                <div className="space-y-3 pt-3 border-t border-card-border animate-slide-down">
                                                    <div>
                                                        <label className="block text-xs font-medium text-muted mb-1">Model</label>
                                                        <select
                                                            value={profile.modelId}
                                                            onChange={(e) => handleProfileChange(profile.id, 'modelId', e.target.value)}
                                                            className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                                                        >
                                                            {getSupportedModels(metadata.name).map(model => (
                                                                <option key={model} value={model}>{model}</option>
                                                            ))}
                                                            {metadata.name === 'custom' && (
                                                                <option value="">Custom model name...</option>
                                                            )}
                                                        </select>
                                                    </div>
                                                    {metadata.name === 'custom' && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-muted mb-1">Base URL</label>
                                                            <input
                                                                type="url"
                                                                value={profile.baseUrl || ''}
                                                                onChange={(e) => handleProfileChange(profile.id, 'baseUrl', e.target.value)}
                                                                placeholder="https://api.example.com/v1"
                                                                className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                                                            />
                                                        </div>
                                                    )}
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={profile.enabled}
                                                            onChange={(e) => handleProfileChange(profile.id, 'enabled', e.target.checked)}
                                                            className="w-4 h-4 rounded border-card-border bg-background text-accent-pro focus:ring-accent-pro"
                                                        />
                                                        <span className="text-sm">Enable this provider</span>
                                                    </label>
                                                    <button
                                                        onClick={() => handleRemoveProvider(profile.id)}
                                                        className="w-full text-red-400 hover:text-red-300 text-sm font-medium flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-red-900/20 border border-red-900/30 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Remove Provider
                                                    </button>
                                                </div>
                                            )}

                                            {!profile && (
                                                <button
                                                    onClick={() => handleAddProvider(metadata.name)}
                                                    className="w-full py-2 px-3 border-2 border-dashed border-card-border rounded-lg text-muted hover:text-foreground hover:border-accent-pro/50 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add {metadata.displayName}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. API Key Configuration */}
                {activeSection === 'api-keys' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-card border border-card-border rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Key className="h-5 w-5 text-accent-pro" />
                                    API Key Configuration
                                </h2>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Object.values(showKeys).some(v => v)}
                                        onChange={(e) => setShowKeys(prev => {
                                            const allProfiles = Object.keys(preferences.providerConfig.profiles);
                                            return allProfiles.reduce((acc, id) => ({ ...acc, [id]: e.target.checked }), {});
                                        })}
                                        className="w-4 h-4 rounded border-card-border bg-background text-accent-pro focus:ring-accent-pro"
                                    />
                                    <span className="text-sm text-muted">Show all keys</span>
                                </label>
                            </div>
                            <p className="text-muted mb-6">Enter API keys for each provider. Keys are stored in memory only and never persisted to localStorage. Server-managed keys (from environment variables) take priority.</p>

                            <div className="space-y-4">
                                {Object.entries(preferences.providerConfig.profiles).map(([id, profile]) => {
                                    const metadata = getProviderMetadata(profile.name);
                                    const hasServerKey = !!process.env[metadata.envVar];
                                    const currentKey = profile.apiKey || '';
                                    const isVisible = showKeys[id];

                                    return (
                                        <div key={id} className="bg-background border border-card-border rounded-xl p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-card-border">
                                                        <Globe className="h-5 w-5 text-foreground" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold">{metadata.displayName}</h3>
                                                        <p className="text-xs text-muted">{metadata.name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {hasServerKey && (
                                                        <span className="px-2 py-0.5 text-xs bg-green-900/30 text-green-300 border border-green-800/50 rounded-full flex items-center gap-1">
                                                            <Shield className="h-3 w-3" />
                                                            Using Server Key
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <label className="block text-xs font-medium text-muted mb-1">API Key</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type={isVisible ? 'text' : 'password'}
                                                        value={currentKey}
                                                        onChange={(e) => handleApiKeyChange(id, e.target.value)}
                                                        placeholder={hasServerKey ? 'Using server environment variable' : 'Enter API key...'}
                                                        disabled={hasServerKey}
                                                        className="flex-1 bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent disabled:opacity-50 font-mono"
                                                        aria-label={`API key for ${metadata.displayName}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowKeys(prev => ({ ...prev, [id]: !isVisible }))}
                                                        className="px-3 py-2 bg-card-border rounded-lg text-muted hover:text-foreground transition-colors"
                                                        aria-label={isVisible ? 'Hide key' : 'Show key'}
                                                    >
                                                        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                    {currentKey && !hasServerKey && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleApiKeyChange(id, '');
                                                                setTestResults(prev => { const next = { ...prev }; delete next[id]; return next; });
                                                            }}
                                                            className="px-3 py-2 bg-card-border rounded-lg text-muted hover:text-red-400 hover:bg-red-900/20 transition-colors"
                                                            aria-label="Clear key"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 mt-3">
                                                <button
                                                    onClick={() => handleTestProvider(id)}
                                                    disabled={testingProvider === id || (!currentKey && !hasServerKey)}
                                                    className="px-4 py-2 text-sm font-medium bg-accent-pro/10 border border-accent-pro/30 text-accent-pro rounded-lg hover:bg-accent-pro/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {testingProvider === id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <TestTube className="h-4 w-4" />
                                                    )}
                                                    {testingProvider === id ? 'Testing...' : 'Test Connection'}
                                                </button>

                                                {testResults[id] && (
                                                    <span className={`text-sm flex items-center gap-1 ${testResults[id].valid ? 'text-green-300' : 'text-red-300'
                                                        }`}>
                                                        {testResults[id].valid ? (
                                                            <>
                                                                <CheckCircle className="h-4 w-4" />
                                                                Connection successful
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertCircle className="h-4 w-4" />
                                                                {testResults[id].error}
                                                            </>
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            {!hasServerKey && (
                                                <p className="text-xs text-muted mt-2">
                                                    <Info className="h-3 w-3 inline-block align-middle mr-1" />
                                                    Set <code className="bg-background px-1 rounded">{metadata.envVar}</code> in server environment variables for production deployments.
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}

                                {Object.keys(preferences.providerConfig.profiles).length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed border-card-border rounded-xl">
                                        <Server className="h-12 w-12 text-muted mx-auto mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No providers configured</h3>
                                        <p className="text-muted mb-4">Add a provider in the <strong>Providers</strong> tab first.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Model Selection */}
                {activeSection === 'models' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-card border border-card-border rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Brain className="h-5 w-5 text-accent-pro" />
                                Model Selection
                            </h2>
                            <p className="text-muted mb-6">Choose specific models for each provider. Custom models can be entered manually for OpenAI-compatible endpoints.</p>

                            <div className="space-y-4">
                                {Object.entries(preferences.providerConfig.profiles).map(([id, profile]) => {
                                    const metadata = getProviderMetadata(profile.name);
                                    const supportedModels = getSupportedModels(profile.name);

                                    return (
                                        <div key={id} className="bg-background border border-card-border rounded-xl p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-card-border">
                                                        <Brain className="h-5 w-5 text-foreground" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold">{metadata.displayName}</h3>
                                                        <p className="text-xs text-muted">Profile: {id}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-muted mb-1">Selected Model</label>
                                                    <select
                                                        value={profile.modelId}
                                                        onChange={(e) => handleProfileChange(id, 'modelId', e.target.value)}
                                                        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                                                    >
                                                        {supportedModels.map(model => (
                                                            <option key={model} value={model}>{model}</option>
                                                        ))}
                                                        {profile.name === 'custom' && !!profile.modelId && !(supportedModels as unknown as string[]).includes(profile.modelId) && (
                                                            <option value={profile.modelId}>{profile.modelId} (custom)</option>
                                                        )}
                                                    </select>
                                                </div>

                                                {profile.name === 'custom' && (
                                                    <div>
                                                        <label className="block text-xs font-medium text-muted mb-1">Custom Model Name</label>
                                                        <input
                                                            type="text"
                                                            value={profile.modelId}
                                                            onChange={(e) => handleProfileChange(id, 'modelId', e.target.value)}
                                                            placeholder="Enter model identifier"
                                                            className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent font-mono"
                                                        />
                                                    </div>
                                                )}

                                                {profile.baseUrl !== undefined && (
                                                    <div className="sm:col-span-2">
                                                        <label className="block text-xs font-medium text-muted mb-1">Base URL (OpenAI-compatible)</label>
                                                        <input
                                                            type="url"
                                                            value={profile.baseUrl || ''}
                                                            onChange={(e) => handleProfileChange(id, 'baseUrl', e.target.value)}
                                                            placeholder="https://api.example.com/v1"
                                                            className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent font-mono"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {Object.keys(preferences.providerConfig.profiles).length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed border-card-border rounded-xl">
                                        <Brain className="h-12 w-12 text-muted mx-auto mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No providers configured</h3>
                                        <p className="text-muted mb-4">Add a provider in the <strong>Providers</strong> tab first.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Role Assignments */}
                {activeSection === 'roles' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-card border border-card-border rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Scale className="h-5 w-5 text-accent-judge" />
                                Role Assignments
                            </h2>
                            <p className="text-muted mb-6">Assign models to debate roles. In shared-model mode, a single model handles all roles. In multi-model mode, each role gets its own model.</p>

                            <div className="mb-6 p-4 bg-background border border-card-border rounded-lg">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.providerConfig.useSharedModel}
                                        onChange={(e) => handleSharedModelToggle(e.target.checked)}
                                        className="w-5 h-5 rounded border-card-border bg-background text-accent-pro focus:ring-accent-pro"
                                    />
                                    <div>
                                        <div className="font-medium">Shared Model Mode</div>
                                        <div className="text-sm text-muted">Use a single model for PRO, CON, and JUDGE roles (recommended for consistency)</div>
                                    </div>
                                </label>
                            </div>

                            {preferences.providerConfig.useSharedModel ? (
                                <div className="bg-background border border-card-border rounded-xl p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-lg bg-accent-pro/10">
                                            <Zap className="h-5 w-5 text-accent-pro" />
                                        </div>
                                        <h3 className="font-semibold">Shared Model</h3>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div>
                                            <label className="block text-xs font-medium text-muted mb-1">Shared Provider</label>
                                            <select
                                                value={preferences.providerConfig.selectedProviderIds.shared || ''}
                                                onChange={(e) => handleSelectionChange('shared', e.target.value || null)}
                                                className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                                            >
                                                <option value="">Select a provider...</option>
                                                {getAvailableProfiles().map(([id, profile]) => {
                                                    const metadata = getProviderMetadata(profile.name);
                                                    return (
                                                        <option key={id} value={id}>
                                                            {metadata.displayName}: {profile.modelId}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-3">
                                    {(['pro', 'con', 'judge'] as const).map(role => {
                                        const config = SPEAKER_CONFIG[role];
                                        const selectedId = preferences.providerConfig.selectedProviderIds[role];
                                        const selectedProfile = selectedId ? preferences.providerConfig.profiles[selectedId] : null;
                                        const available = getAvailableProfiles(role);

                                        return (
                                            <div key={role} className={`bg-background border border-card-border rounded-xl p-5 ${config.border}`}>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className={`p-2 rounded-lg ${config.bg}`}>
                                                        <config.icon className={`h-5 w-5 ${config.color}`} />
                                                    </div>
                                                    <h3 className={`font-semibold ${config.color}`}>{config.label} Role</h3>
                                                </div>

                                                <select
                                                    value={selectedId || ''}
                                                    onChange={(e) => handleSelectionChange(role, e.target.value || null)}
                                                    className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent mb-3"
                                                >
                                                    <option value="">Select a provider...</option>
                                                    {available.map(([id, profile]) => {
                                                        const metadata = getProviderMetadata(profile.name);
                                                        return (
                                                            <option key={id} value={id}>
                                                                {metadata.displayName}: {profile.modelId}
                                                            </option>
                                                        );
                                                    })}
                                                </select>

                                                {selectedProfile && (
                                                    <div className="text-xs text-muted space-y-1">
                                                        <p>Provider: <span className="font-mono">{getProviderDisplayName(selectedProfile.name)}</span></p>
                                                        <p>Model: <span className="font-mono">{selectedProfile.modelId}</span></p>
                                                        <p>Key: <span className={selectedProfile.apiKey ? 'text-green-400' : 'text-amber-400'}>{selectedProfile.apiKey ? 'User provided' : selectedProfile.isServerManaged ? 'Server managed' : 'Not configured'}</span></p>
                                                    </div>
                                                )}

                                                {available.length === 0 && (
                                                    <p className="text-sm text-amber-400">No available providers. Add providers in the Providers tab.</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {!hasConfiguredProvider && (
                                <div className="bg-amber-900/30 border border-amber-800/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-amber-300">
                                        <AlertCircle className="h-5 w-5" />
                                        <span className="font-medium">No providers configured</span>
                                    </div>
                                    <p className="text-amber-200 mt-2">Please configure at least one provider with an API key in the <strong>Providers</strong> and <strong>API Keys</strong> tabs.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. Debate Settings */}
                {activeSection === 'debate' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-card border border-card-border rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-accent-pro" />
                                Debate Settings
                            </h2>
                            <p className="text-muted mb-6">Configure debate format, structure, and playback behavior.</p>

                            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                {/* Format */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-3">Debate Format</label>
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                                        {FORMAT_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => handleDebateSettingChange('format', option.value)}
                                                className={`relative p-4 rounded-lg border-2 transition-all text-left ${preferences.debateSettings.format === option.value
                                                    ? 'border-accent-pro bg-accent-pro/5'
                                                    : 'border-card-border hover:border-accent-pro/50'
                                                    }`}
                                            >
                                                <div className="font-medium text-foreground">{option.label}</div>
                                                <div className="text-sm text-muted mt-1">{option.description}</div>
                                                {preferences.debateSettings.format === option.value && (
                                                    <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-accent-pro" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Rounds */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Number of Rounds</label>
                                    <select
                                        value={preferences.debateSettings.rounds}
                                        onChange={(e) => handleDebateSettingChange('rounds', Number(e.target.value))}
                                        className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                                    >
                                        {[2, 3, 4, 5].map((r) => (
                                            <option key={r} value={r}>{r} rounds</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Language */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Debate Language</label>
                                    <select
                                        value={preferences.debateSettings.language || 'English'}
                                        onChange={(e) => handleDebateSettingChange('language', e.target.value)}
                                        className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                                    >
                                        {['English', 'Hinglish'].map((lang) => (
                                            <option key={lang} value={lang}>{lang}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Playback Speed */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Default Playback Speed</label>
                                    <select
                                        value={preferences.debateSettings.playbackSpeed}
                                        onChange={(e) => handleDebateSettingChange('playbackSpeed', Number(e.target.value))}
                                        className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                                    >
                                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                                            <option key={s} value={s}>{s}x</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Max Words Per Message */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Max Words Per Message</label>
                                    <input
                                        type="number"
                                        value={preferences.debateSettings.maxWordsPerMessage}
                                        onChange={(e) => handleDebateSettingChange('maxWordsPerMessage', Number(e.target.value))}
                                        min={30}
                                        max={500}
                                        step={10}
                                        className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                                    />
                                </div>

                                {/* Temperature */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Temperature</label>
                                    <input
                                        type="range"
                                        value={preferences.debateSettings.temperature}
                                        onChange={(e) => handleDebateSettingChange('temperature', Number(e.target.value))}
                                        min={0}
                                        max={2}
                                        step={0.1}
                                        className="w-full h-2 bg-card-border rounded-lg appearance-none accent-accent-pro"
                                    />
                                    <div className="flex justify-between text-xs text-muted mt-1">
                                        <span>0 (Focused)</span>
                                        <span className="font-mono">{preferences.debateSettings.temperature}</span>
                                        <span>2 (Creative)</span>
                                    </div>
                                </div>

                                {/* Max Output Tokens */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Max Output Tokens</label>
                                    <input
                                        type="number"
                                        value={preferences.debateSettings.maxOutputTokens}
                                        onChange={(e) => handleDebateSettingChange('maxOutputTokens', Number(e.target.value))}
                                        min={500}
                                        max={8000}
                                        step={500}
                                        className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Feature Toggles */}
                        <div className="bg-card border border-card-border rounded-xl p-6">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <SlidersHorizontal className="h-5 w-5 text-accent-pro" />
                                Optional Features
                            </h3>
                            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                    { key: 'includeCrossExamination' as const, label: 'Cross-Examination', desc: 'Allow debaters to question each other', icon: HelpCircle },
                                    { key: 'includeEvidence' as const, label: 'Evidence Requirement', desc: 'Require citations and evidence in arguments', icon: Scale },
                                    { key: 'enableJudge' as const, label: 'Independent Judge', desc: 'Enable judge verdict with scoring rubric', icon: Scale },
                                ].map(({ key, label, desc, icon: Icon }) => (
                                    <label key={key} className="flex items-start gap-3 p-3 bg-background border border-card-border rounded-lg cursor-pointer hover:border-accent-pro/50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={preferences.debateSettings[key]}
                                            onChange={(e) => handleDebateSettingChange(key, e.target.checked)}
                                            className="mt-1 w-4 h-4 rounded border-card-border bg-background text-accent-pro focus:ring-accent-pro"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium flex items-center gap-1">
                                                <Icon className="h-4 w-4 text-muted" />
                                                {label}
                                            </div>
                                            <div className="text-sm text-muted mt-0.5">{desc}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. Advanced Settings */}
                {activeSection === 'advanced' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-card border border-card-border rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <SlidersHorizontal className="h-5 w-5 text-accent-pro" />
                                Custom Instructions
                            </h2>
                            <p className="text-muted mb-6">Provide custom system instructions for each role. These are appended to the default prompts.</p>

                            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
                                {(['pro', 'con', 'judge'] as const).map(role => {
                                    const config = SPEAKER_CONFIG[role];
                                    return (
                                        <div key={role} className={`bg-background border border-card-border rounded-xl p-5 ${config.border}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className={`p-2 rounded-lg ${config.bg}`}>
                                                    <config.icon className={`h-5 w-5 ${config.color}`} />
                                                </div>
                                                <h3 className={`font-semibold ${config.color}`}>{config.label} Instructions</h3>
                                            </div>
                                            <textarea
                                                value={preferences.debateSettings.customInstructions[role] || ''}
                                                onChange={(e) => handleCustomInstructionChange(role, e.target.value)}
                                                placeholder={`Custom instructions for ${config.label}...`}
                                                rows={6}
                                                className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent resize-none font-mono text-xs"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-card border border-card-border rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Palette className="h-5 w-5 text-accent-pro" />
                                UI Preferences
                            </h2>
                            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Theme</label>
                                    <select
                                        value={preferences.ui.theme}
                                        onChange={(e) => setPreferences(prev => ({ ...prev, ui: { ...prev.ui, theme: e.target.value as any } }))}
                                        className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-pro/50 focus:border-transparent"
                                    >
                                        <option value="dark">Dark</option>
                                        <option value="light">Light</option>
                                        <option value="system">System</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={preferences.ui.reducedMotion}
                                            onChange={(e) => setPreferences(prev => ({ ...prev, ui: { ...prev.ui, reducedMotion: e.target.checked } }))}
                                            className="w-4 h-4 rounded border-card-border bg-background text-accent-pro focus:ring-accent-pro"
                                        />
                                        <span className="text-sm">Reduced Motion</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-card-border rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Info className="h-5 w-5 text-accent-pro" />
                                Security & Privacy Notes
                            </h2>
                            <div className="space-y-3 text-sm text-muted">
                                <div className="flex gap-3 p-3 bg-background border border-card-border rounded-lg">
                                    <Lock className="h-5 w-5 text-accent-pro flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-foreground">API Key Security</p>
                                        <p>Keys entered here are stored in memory only during your session. They are never saved to localStorage, cookies, or sent to any third party except the respective LLM provider APIs over HTTPS.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 p-3 bg-background border border-card-border rounded-lg">
                                    <Server className="h-5 w-5 text-accent-pro flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-foreground">Server Environment Variables</p>
                                        <p>For production deployments, set <code className="bg-background px-1 rounded">OPENAI_API_KEY</code>, <code className="bg-background px-1 rounded">GEMINI_API_KEY</code>, and <code className="bg-background px-1 rounded">ANTHROPIC_API_KEY</code> as server environment variables. These take priority over user-entered keys.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 p-3 bg-background border border-card-border rounded-lg">
                                    <Shield className="h-5 w-5 text-accent-pro flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-foreground">SSRF Protection</p>
                                        <p>Custom provider endpoints are validated to prevent Server-Side Request Forgery. Only HTTPS URLs are allowed, and localhost/private IP ranges are blocked.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 p-3 bg-background border border-card-border rounded-lg">
                                    <Bell className="h-5 w-5 text-accent-pro flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-foreground">Rate Limiting</p>
                                        <p>The debate generation API is rate-limited to 10 requests per minute per IP address to prevent abuse.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}