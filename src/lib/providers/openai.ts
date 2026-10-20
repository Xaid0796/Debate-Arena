/**
 * OpenAI provider adapter
 */

import OpenAI from 'openai';
import { ProviderAdapter, ProviderCallOptions, ProviderResponse, PROVIDER_METADATA } from './types';
import { GenerateDebateRequestValidated, DebateTranscriptValidated } from '@/lib/debate/types';
import { DebateTranscriptSchema } from '@/lib/debate/types';

export class OpenAIAdapter implements ProviderAdapter {
    name = 'openai' as const;
    private client: OpenAI | null = null;

    private getClient(apiKey: string, baseUrl?: string): OpenAI {
        if (!this.client || baseUrl) {
            this.client = new OpenAI({
                apiKey,
                baseURL: baseUrl || undefined,
                dangerouslyAllowBrowser: false,
            });
        }
        return this.client;
    }

    async generateDebate(
        request: GenerateDebateRequestValidated,
        apiKey: string,
        baseUrl?: string,
        language?: string
    ): Promise<DebateTranscriptValidated> {
        const client = this.getClient(apiKey, baseUrl);
        const { systemPrompt, userPrompt } = this.buildPrompts(request, language);

        const response = await client.chat.completions.create({
            model: request.providerConfig.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: request.temperature,
            max_tokens: request.maxOutputTokens,
            response_format: { type: 'json_object' },
        }, {
            timeout: 120000,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from OpenAI');
        }

        return this.parseAndValidateResponse(content, request);
    }

    async validateConfig(model: string, apiKey: string, baseUrl?: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const client = this.getClient(apiKey, baseUrl);
            await client.models.list();
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error instanceof Error ? error.message : 'Validation failed' };
        }
    }

    getDefaultModel(): string {
        return PROVIDER_METADATA.openai.defaultModel;
    }

    getSupportedModels(): string[] {
        return [...PROVIDER_METADATA.openai.supportedModels];
    }

    private buildPrompts(request: GenerateDebateRequestValidated, language?: string): { systemPrompt: string; userPrompt: string } {
        const formatInstructions = this.getFormatInstructions(request.format);
        const crossExamination = request.includeCrossExamination ? 'Include cross-examination questions and responses between rounds.' : '';
        const evidence = request.includeEvidence ? 'Include evidence citations where appropriate.' : '';
        const judgeEnabled = request.enableJudge ? 'Provide a final judge verdict with scoring.' : 'No judge verdict needed.';
        const lang = language || 'English';
        const languageInstruction = `CRITICAL LANGUAGE REQUIREMENT: The ENTIRE debate, including all PRO arguments, CON arguments, cross-examinations, and the final JUDGE verdict/conclusion/arguments, MUST be written 100% in ${lang}. Do not use English unless ${lang} is English. For Hinglish, use Roman Hindi / conversational Hinglish.`;

        const systemPrompt = `You are an AI debate orchestrator. Generate a complete, structured debate transcript between a PRO and CON debater on the given topic.

${formatInstructions}

${languageInstruction}

DEBATE STRUCTURE:
- ${request.rounds} rounds
- Each message: 40-${request.maxWordsPerMessage} words, one primary claim per message
- Short, direct arguments - no walls of text
- ${crossExamination}
- ${evidence}
- ${judgeEnabled}

OUTPUT FORMAT: Return ONLY valid JSON matching this schema:
{
  "topic": "string",
  "format": "${request.format}",
  "rounds": ${request.rounds},
  "messages": [
    {
      "id": "msg-1",
      "speaker": "pro|con|judge",
      "phase": "opening|rebuttal|counterargument|cross-examination|closing|verdict",
      "round": 1,
      "text": "Concise argument...",
      "respondsTo": "msg-id|null",
      "wordCount": 45,
      "timestamp": 1234567890
    }
  ],
  "verdict": {
    "winner": "pro|con|inconclusive",
    "proScore": 0-100,
    "conScore": 0-100,
    "criteria": {
      "evidenceQuality": 0-10,
      "logicalReasoning": 0-10,
      "rebuttalEffectiveness": 0-10,
      "responsiveness": 0-10,
      "clarityRelevance": 0-10
    },
    "strongestProArgument": "string",
    "strongestConArgument": "string",
    "limitations": ["string"],
    "conclusion": "100-180 word conclusion"
  },
  "generatedAt": 1234567890,
  "modelUsed": "${request.providerConfig.model}",
  "providerUsed": "openai"
}`;

        const customPro = request.customInstructions.pro ? `\nPRO CUSTOM INSTRUCTIONS: ${request.customInstructions.pro}` : '';
        const customCon = request.customInstructions.con ? `\nCON CUSTOM INSTRUCTIONS: ${request.customInstructions.con}` : '';
        const customJudge = request.customInstructions.judge ? `\nJUDGE CUSTOM INSTRUCTIONS: ${request.customInstructions.judge}` : '';

        const userPrompt = `TOPIC: "${request.topic}"

Generate a complete debate transcript with ${this.estimateMessageCount(request)} messages total.

${customPro}${customCon}${customJudge}

Return ONLY the JSON object.`;

        return { systemPrompt, userPrompt };
    }

    private getFormatInstructions(format: string): string {
        switch (format) {
            case 'steelman':
                return 'FORMAT: STEELMAN DEBATE - Each debater must fairly summarize the strongest reasonable version of the opposing argument before rebutting it. Steelman summaries should be explicit and clearly labeled.';
            case 'devils-advocate':
                return 'FORMAT: DEVIL\'S ADVOCATE - Each debater actively challenges assumptions, identifies weaknesses, and tests the opposing position. Focus on critical examination over defense.';
            default:
                return 'FORMAT: STANDARD DEBATE - Both sides defend their assigned positions and challenge opposing arguments directly.';
        }
    }

    private estimateMessageCount(request: GenerateDebateRequestValidated): number {
        let count = request.rounds * 4; // opening, rebuttal, counterargument, closing per round (simplified)
        if (request.includeCrossExamination) count += request.rounds * 2;
        if (request.enableJudge) count += 1;
        return Math.min(count, 20);
    }

    private parseAndValidateResponse(content: string, request: GenerateDebateRequestValidated): DebateTranscriptValidated {
        let parsed: unknown;
        try {
            parsed = JSON.parse(content);
        } catch {
            throw new Error('Invalid JSON response from model');
        }

        const result = DebateTranscriptSchema.safeParse(parsed);
        if (!result.success) {
            throw new Error(`Response validation failed: ${result.error.message}`);
        }

        // Ensure word counts are accurate
        const messagesWithCounts = result.data.messages.map(msg => ({
            ...msg,
            wordCount: msg.text.trim().split(/\s+/).length,
        }));

        return {
            ...result.data,
            messages: messagesWithCounts,
        };
    }
}

export const openaiAdapter = new OpenAIAdapter();