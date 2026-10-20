/**
 * Secure Route Handler for debate generation
 * Server-side only - never exposes API keys to client
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeValidate } from '@/lib/config/validation';
import { GenerateDebateRequestSchema } from '@/lib/debate/types';
import { generateDebate } from '@/lib/providers/registry';
import { GenerateDebateRequestValidated } from '@/lib/debate/types';

// Rate limiting (in-memory, for demo - use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return { allowed: true };
    }

    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
    }

    record.count++;
    return { allowed: true };
}

function sanitizeErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        // Remove potential API keys from error messages
        return error.message
            .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED]')
            .replace(/AIza[a-zA-Z0-9_-]{35}/g, '[REDACTED]')
            .replace(/sk-ant-[a-zA-Z0-9_-]{95}/g, '[REDACTED]');
    }
    return 'An unexpected error occurred';
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const clientIp = getClientIp(request);

    // Rate limiting
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.', retryAfter: rateLimit.retryAfter },
            { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
        );
    }

    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
        return NextResponse.json(
            { error: 'Content-Type must be application/json' },
            { status: 400 }
        );
    }

    // Parse and validate request body
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 }
        );
    }

    // Validate request structure
    const validation = safeValidate(GenerateDebateRequestSchema, body);
    if (!validation.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: validation.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const requestData = validation.data as GenerateDebateRequestValidated;

    // Validate provider
    const { providerConfig, roleModels, useSharedModel } = requestData;
    const provider = providerConfig.provider;

    // Determine API key to use
    let apiKey = providerConfig.apiKey;
    let baseUrl = providerConfig.baseUrl;

    // For server-managed keys, check environment variables
    if (!apiKey) {
        const envVarMap: Record<string, string> = {
            openai: 'OPENAI_API_KEY',
            gemini: 'GEMINI_API_KEY',
            anthropic: 'ANTHROPIC_API_KEY',
            custom: 'CUSTOM_API_KEY',
        };
        const envVar = envVarMap[provider];
        if (envVar && process.env[envVar]) {
            apiKey = process.env[envVar];
        }
    }

    if (!apiKey) {
        return NextResponse.json(
            { error: `API key required for ${provider}. Configure in Settings or set ${provider.toUpperCase()}_API_KEY environment variable.` },
            { status: 400 }
        );
    }

    // Validate model
    if (!providerConfig.model) {
        return NextResponse.json(
            { error: 'Model ID is required' },
            { status: 400 }
        );
    }

    try {
        // Generate debate
        const transcript = await generateDebate(requestData, apiKey, baseUrl, requestData.language);

        // Add server-side metadata
        const response = {
            ...transcript,
            serverGeneratedAt: Date.now(),
            generationTimeMs: Date.now() - startTime,
        };

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'X-Generation-Time': String(Date.now() - startTime),
            },
        });
    } catch (error) {
        console.error('Debate generation error:', error);

        let errorMessage = sanitizeErrorMessage(error);
        const errorStr = (error instanceof Error ? error.message : String(error)).toLowerCase();

        // Check for 503, service unavailable, overload, or general provider api errors
        if (
            errorStr.includes('503') ||
            errorStr.includes('service unavailable') ||
            errorStr.includes('overloaded') ||
            errorStr.includes('high demand') ||
            errorStr.includes('resource_exhausted') ||
            errorStr.includes('gateway') ||
            errorStr.includes('internal server error') ||
            (provider === 'gemini' && (errorStr.includes('503') || errorStr.includes('unavailable') || errorStr.includes('overload') || errorStr.includes('error') || errorStr.includes('failed')))
        ) {
            errorMessage = "Temporarily Unavailable. We're experiencing high demand right now. Please try again in a moment.";
        }

        // Determine appropriate status code
        let status = 500;
        if (errorMessage.includes("Temporarily Unavailable")) {
            status = 503;
        } else if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
            status = 401;
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
            status = 429;
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
            status = 504;
        } else if (errorMessage.includes('validation') || errorMessage.includes('Invalid JSON') || errorMessage.includes('schema')) {
            status = 502; // Bad gateway - provider returned invalid data
        }

        return NextResponse.json(
            { error: errorMessage },
            { status }
        );
    }
}

// Handle unsupported methods
export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed. Use POST to generate a debate.' },
        { status: 405, headers: { Allow: 'POST' } }
    );
}