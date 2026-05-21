import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';

// ─── Output Schema ───────────────────────────────────────────────────────────

const ScholarshipOutputSchema = z.object({
    title: z.string().describe('The official name of the scholarship'),
    provider: z.string().describe('The organization providing the scholarship'),
    amount: z.number().describe('The monetary value in INR. If not specified or variable, estimate or use 0'),
    deadline: z.string().describe('The application deadline in ISO 8601 format (YYYY-MM-DD). If it says "Always Open", use a date 10 years in the future.'),
    description: z.string().describe('A comprehensive description of the scholarship, highlighting its purpose.'),
    eligibility: z.object({
        title: z.string().describe('Short summary of who is eligible (e.g. "Class 10 Girls")'),
        details: z.string().describe('Detailed eligibility criteria'),
    }),
    fieldOfStudy: z.array(z.string()).describe('Applicable fields of study, e.g., ["Engineering", "Medicine", "Arts", "General"]'),
    location: z.string().describe('Applicable location, e.g., "india" or specific state like "maharashtra"'),
    eligibilityLevel: z.array(z.string()).describe('e.g., ["Class 9", "Class 10", "Undergraduate", "Postgraduate", "Diploma"]'),
    scholarshipType: z.string().describe('e.g., "Merit-based", "Financial Need", "Minority", "Disability"'),
    gender: z.string().describe('e.g., "Female", "all", "Male"'),
    religion: z.string().describe('e.g., "all", "Muslim", "Christian"'),
});

export type ParsedScholarship = z.infer<typeof ScholarshipOutputSchema>;

const OUTPUT_SCHEMA = z.object({ scholarships: z.array(ScholarshipOutputSchema) });

// ─── Payload Sanitizer ───────────────────────────────────────────────────────

const MAX_CHARS = 12_000;

function sanitizePayload(raw: string): string {
    // Strip all HTML tags aggressively
    let text = raw
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<svg[\s\S]*?<\/svg>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s{2,}/g, ' ')
        .trim();

    // Truncate to max chars
    if (text.length > MAX_CHARS) {
        text = text.slice(0, MAX_CHARS) + '... [truncated]';
    }

    return text;
}

// ─── Exponential Backoff ─────────────────────────────────────────────────────

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function withExponentialBackoff<T>(
    fn: () => Promise<T>,
    label: string,
    maxRetries = 3,
): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const is429 = err?.statusCode === 429 || err?.status === 429 ||
                err?.message?.includes('429') || err?.message?.includes('quota') ||
                err?.message?.includes('rate limit');

            if (is429 && attempt < maxRetries - 1) {
                // Extract retry-after from error message if available, else exponential
                const retryAfterMatch = err?.message?.match(/retry in (\d+(?:\.\d+)?)s/i);
                const retryMs = retryAfterMatch
                    ? Math.ceil(parseFloat(retryAfterMatch[1]) * 1000)
                    : Math.pow(2, attempt + 1) * 5000; // 10s, 20s, 40s
                console.warn(`⏳ [${label}] 429 Rate limit hit. Retrying in ${retryMs / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
                await sleep(retryMs);
                continue;
            }

            // Non-429 errors or final attempt — throw immediately
            throw err;
        }
    }
    throw lastError;
}

// ─── Core AI Caller ──────────────────────────────────────────────────────────

async function callAI(prompt: string): Promise<ParsedScholarship[]> {
    // Build ordered list of Gemini keys from env
    const geminiKeys: string[] = [];
    const multiKeyStr = process.env.GEMINI_API_KEYS || '';
    if (multiKeyStr) {
        multiKeyStr.split(',').map(k => k.trim()).filter(Boolean).forEach(k => geminiKeys.push(k));
    }
    // Also accept single key env var as fallback
    const singleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (singleKey && !geminiKeys.includes(singleKey)) {
        geminiKeys.push(singleKey);
    }

    // Try each Gemini key with exponential backoff
    for (let i = 0; i < geminiKeys.length; i++) {
        const key = geminiKeys[i];
        try {
            console.log(`🤖 [Gemini Key ${i + 1}/${geminiKeys.length}] Attempting parse...`);
            const google = createGoogleGenerativeAI({ apiKey: key });
            const result = await withExponentialBackoff(
                () => generateObject({
                    model: google('gemini-2.0-flash'),
                    schema: OUTPUT_SCHEMA,
                    prompt,
                }),
                `Gemini-Key-${i + 1}`,
                3,
            );
            console.log(`✅ [Gemini Key ${i + 1}] Success — ${result.object.scholarships.length} scholarships found.`);
            return result.object.scholarships;
        } catch (err: any) {
            console.warn(`❌ [Gemini Key ${i + 1}] Failed: ${err?.message?.slice(0, 120)}`);
            if (i < geminiKeys.length - 1) {
                console.log(`🔄 Switching to Gemini Key ${i + 2}...`);
                await sleep(2000); // Brief pause before switching keys
            }
        }
    }

    // ── Groq Fallback 1: Llama 70b ───────────────────────────────────────────
    try {
        console.log('🦙 [Groq Fallback 1] Llama-3.3-70b-versatile...');
        const result = await withExponentialBackoff(
            () => generateObject({
                model: groq('llama-3.3-70b-versatile'),
                schema: OUTPUT_SCHEMA,
                prompt,
            }),
            'Groq-70b',
            2,
        );
        console.log(`✅ [Groq-70b] Success — ${result.object.scholarships.length} scholarships found.`);
        return result.object.scholarships;
    } catch (err: any) {
        console.warn(`❌ [Groq-70b] Failed: ${err?.message?.slice(0, 120)}`);
    }

    // ── Groq Fallback 2: Llama 8b (last resort) ──────────────────────────────
    try {
        console.log('🦙 [Groq Fallback 2] Llama-3.1-8b-instant (last resort)...');
        const result = await withExponentialBackoff(
            () => generateObject({
                model: groq('llama-3.1-8b-instant'),
                schema: OUTPUT_SCHEMA,
                prompt,
            }),
            'Groq-8b',
            2,
        );
        console.log(`✅ [Groq-8b] Success — ${result.object.scholarships.length} scholarships found.`);
        return result.object.scholarships;
    } catch (err: any) {
        console.warn(`❌ [Groq-8b] Failed: ${err?.message?.slice(0, 120)}`);
    }

    // All providers failed — return empty gracefully
    console.error('🚨 All AI providers exhausted. Returning empty result.');
    return [];
}

// ─── Public API (drop-in replacement for Genkit flow) ────────────────────────

export interface ParseScholarshipInput {
    title: string;
    provider: string;
    descriptionSnippet: string;
    sourceUrl: string;
    rawHtml?: string;
}

export async function parseScholarshipFlow(input: ParseScholarshipInput): Promise<ParsedScholarship[]> {
    const cleanedText = sanitizePayload(input.rawHtml || '');

    if (cleanedText.length < 100) {
        console.warn(`[parseScholarshipFlow] Payload too short after sanitization (${cleanedText.length} chars). Skipping.`);
        return [];
    }

    const prompt = `Extract ALL scholarships from the following text scraped from ${input.sourceUrl}.
Today's date is ${new Date().toISOString()}.

Rules:
- Return structured JSON only. No commentary.
- If multiple scholarships are listed, return all of them.
- If there are no real scholarships, return an empty scholarships array.
- Deadline MUST be in YYYY-MM-DD format. If "Always Open", use "${new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}".
- Amount should be in INR. If unknown or variable, use 0.

Scraped Text:
Title Hint: ${input.title}
Provider Hint: ${input.provider}
Snippet: ${input.descriptionSnippet}

Content:
${cleanedText}`;

    try {
        const results = await callAI(prompt);
        return results;
    } catch (err: any) {
        console.error('[parseScholarshipFlow] Unhandled error:', err?.message);
        return [];
    }
}
