/**
 * Debate transcript types and validation schemas
 */

import { z } from 'zod';
import { DebateFormat } from '@/lib/config/types';

export type Speaker = 'pro' | 'con' | 'judge';
export type Phase = 'opening' | 'rebuttal' | 'counterargument' | 'cross-examination' | 'closing' | 'verdict';

export interface DebateMessage {
    id: string;
    speaker: Speaker;
    phase: Phase;
    round: number;
    text: string;
    respondsTo: string | null;
    wordCount: number;
    timestamp: number;
}

export interface ScoreCriteria {
    evidenceQuality: number;
    logicalReasoning: number;
    rebuttalEffectiveness: number;
    responsiveness: number;
    clarityRelevance: number;
}

export interface Verdict {
    winner: 'pro' | 'con' | 'inconclusive';
    proScore: number;
    conScore: number;
    criteria: ScoreCriteria;
    strongestProArgument: string;
    strongestConArgument: string;
    limitations: string[];
    conclusion: string;
}

export interface DebateTranscript {
    topic: string;
    format: DebateFormat;
    rounds: number;
    messages: DebateMessage[];
    verdict: Verdict;
    generatedAt: number;
    modelUsed: string;
    providerUsed: string;
}

export interface GenerateDebateRequest {
    topic: string;
    format: DebateFormat;
    rounds: number;
    language: string;
    maxWordsPerMessage: number;
    temperature: number;
    maxOutputTokens: number;
    includeCrossExamination: boolean;
    includeEvidence: boolean;
    enableJudge: boolean;
    customInstructions: {
        pro?: string;
        con?: string;
        judge?: string;
    };
    providerConfig: {
        provider: string;
        model: string;
        apiKey?: string;
        baseUrl?: string;
    };
    roleModels?: {
        pro?: { provider: string; model: string; apiKey?: string; baseUrl?: string };
        con?: { provider: string; model: string; apiKey?: string; baseUrl?: string };
        judge?: { provider: string; model: string; apiKey?: string; baseUrl?: string };
    };
    useSharedModel: boolean;
}

// Zod schemas for validation
export const ScoreCriteriaSchema = z.object({
    evidenceQuality: z.number().min(0).max(10),
    logicalReasoning: z.number().min(0).max(10),
    rebuttalEffectiveness: z.number().min(0).max(10),
    responsiveness: z.number().min(0).max(10),
    clarityRelevance: z.number().min(0).max(10),
});

export const VerdictSchema = z.object({
    winner: z.enum(['pro', 'con', 'inconclusive']),
    proScore: z.number().min(0).max(100),
    conScore: z.number().min(0).max(100),
    criteria: ScoreCriteriaSchema,
    strongestProArgument: z.string().min(1).max(2000),
    strongestConArgument: z.string().min(1).max(2000),
    limitations: z.array(z.string().max(1000)).max(5),
    conclusion: z.string().min(1).max(3000),
});

export const DebateMessageSchema = z.object({
    id: z.string().min(1),
    speaker: z.enum(['pro', 'con', 'judge']),
    phase: z.enum(['opening', 'rebuttal', 'counterargument', 'cross-examination', 'closing', 'verdict']),
    round: z.union([z.number(), z.string()]).transform(val => Number(val)),
    text: z.string().min(1).max(2000),
    respondsTo: z.string().nullable(),
    wordCount: z.union([z.number(), z.string()]).transform(val => Number(val)),
    timestamp: z.union([z.number(), z.string()]).transform(val => Number(val)),
});

export const DebateTranscriptSchema = z.object({
    topic: z.string().min(5).max(200),
    format: z.enum(['standard', 'steelman', 'devils-advocate']),
    rounds: z.number().int().min(1).max(5),
    messages: z.array(DebateMessageSchema).min(4).max(20),
    verdict: VerdictSchema,
    generatedAt: z.number().int().positive(),
    modelUsed: z.string().min(1),
    providerUsed: z.string().min(1),
    enableJudge: z.boolean().default(true),
});

export const GenerateDebateRequestSchema = z.object({
    topic: z.string().min(5).max(200),
    format: z.enum(['standard', 'steelman', 'devils-advocate']),
    rounds: z.number().int().min(1).max(5),
    language: z.string().default('English'),
    maxWordsPerMessage: z.number().int().min(20).max(200),
    temperature: z.number().min(0).max(2),
    maxOutputTokens: z.number().int().min(500).max(8000),
    includeCrossExamination: z.boolean(),
    includeEvidence: z.boolean(),
    enableJudge: z.boolean(),
    customInstructions: z.object({
        pro: z.string().max(1000).optional(),
        con: z.string().max(1000).optional(),
        judge: z.string().max(1000).optional(),
    }),
    providerConfig: z.object({
        provider: z.string().min(1),
        model: z.string().min(1),
        apiKey: z.string().optional(),
        baseUrl: z.string().url().optional(),
    }),
    roleModels: z.object({
        pro: z.object({
            provider: z.string().min(1),
            model: z.string().min(1),
            apiKey: z.string().optional(),
            baseUrl: z.string().url().optional(),
        }).optional(),
        con: z.object({
            provider: z.string().min(1),
            model: z.string().min(1),
            apiKey: z.string().optional(),
            baseUrl: z.string().url().optional(),
        }).optional(),
        judge: z.object({
            provider: z.string().min(1),
            model: z.string().min(1),
            apiKey: z.string().optional(),
            baseUrl: z.string().url().optional(),
        }).optional(),
    }).optional(),
    useSharedModel: z.boolean(),
});

export type GenerateDebateRequestValidated = z.infer<typeof GenerateDebateRequestSchema>;
export type DebateTranscriptValidated = z.infer<typeof DebateTranscriptSchema>;