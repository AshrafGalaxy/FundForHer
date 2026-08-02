/**
 * parse-scholarship-flow.ts
 *
 * 4-Tier Resilient Scholarship Parsing Orchestrator
 * ──────────────────────────────────────────────────
 * Tier 1  →  JSON-LD / Schema.org structured data  (free, 0 API calls)
 * Tier 2  →  Regex pattern matching                 (free, 0 API calls)
 * Tier 3  →  Cloudflare Workers AI (llama-3.1-8b)  (free, fills gaps)
 * Tier 4  →  Gemini (multi-key) → Groq (70b → 8b) (paid, last resort)
 *
 * Only escalates when the previous tier produces insufficient confidence.
 * Confidence gate:  >= 7  → save directly (Tier 1+2 sufficient)
 *                    4–6  → use Cloudflare AI to fill missing fields
 *                    < 4  → full Tier 4 (Gemini / Groq) parse
 */

import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';
import { ruleBasedParse, type RuleBasedResult } from '@/server/scraper/rule-based-parser';
import { fillMissingFieldsWithCloudflare } from '@/server/ai/cloudflare-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParseScholarshipInput {
    title: string;
    provider: string;
    descriptionSnippet: string;
    sourceUrl: string;
    rawHtml?: string;
}

const ScholarshipOutputSchema = z.object({
    title: z.string().describe('The official name of the scholarship'),
    provider: z.string().describe('The organization providing the scholarship'),
    amount: z.number().describe('The monetary value in INR. If not specified or variable, use 0'),
    deadline: z.string().describe('Application deadline in YYYY-MM-DD. If "Always Open", use a date 10 years out.'),
    description: z.string().describe('Comprehensive description of the scholarship purpose'),
    eligibility: z.object({
        title: z.string().describe('Short summary of who is eligible (e.g. "Class 10 Girls")'),
        details: z.string().describe('Detailed eligibility criteria'),
    }),
    fieldOfStudy: z.array(z.string()),
    location: z.string().describe('Applicable location, e.g. "india" or "maharashtra"'),
    eligibilityLevel: z.array(z.string()),
    scholarshipType: z.string(),
    gender: z.string().describe('"Female", "Male", or "all"'),
    religion: z.string().describe('"all" or specific religion'),
});

export type ParsedScholarship = z.infer<typeof ScholarshipOutputSchema>;
const OUTPUT_SCHEMA = z.object({ scholarships: z.array(ScholarshipOutputSchema) });

// ─── Payload Sanitizer ────────────────────────────────────────────────────────

const MAX_CHARS = 12_000;

function sanitizePayload(raw: string): string {
    return raw
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<svg[\s\S]*?<\/svg>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, MAX_CHARS);
}

// ─── Exponential Backoff ──────────────────────────────────────────────────────

async function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

async function withBackoff<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
    let lastErr: any;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastErr = err;
            const is429 = err?.status === 429 || err?.statusCode === 429 ||
                String(err?.message).includes('429') ||
                String(err?.message).toLowerCase().includes('quota') ||
                String(err?.message).toLowerCase().includes('rate limit');
            if (is429 && i < retries - 1) {
                const retryAfter = (() => {
                    const m = String(err?.message).match(/retry in (\d+(?:\.\d+)?)s/i);
                    return m ? Math.ceil(parseFloat(m[1]) * 1000) : Math.pow(2, i + 1) * 5000;
                })();
                console.warn(`⏳ [${label}] 429 — retrying in ${retryAfter / 1000}s (${i + 1}/${retries})`);
                await sleep(retryAfter);
                continue;
            }
            throw err;
        }
    }
    throw lastErr;
}

// ─── Tier 4: Full AI Fallback ─────────────────────────────────────────────────

async function tier4FullAIParse(prompt: string): Promise<ParsedScholarship[]> {
    // Build Gemini key list
    const keys: string[] = [];
    (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean).forEach(k => keys.push(k));
    const single = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (single && !keys.includes(single)) keys.push(single);

    for (let i = 0; i < keys.length; i++) {
        try {
            console.log(`🤖 [Tier 4 — Gemini Key ${i + 1}/${keys.length}] Parsing...`);
            const google = createGoogleGenerativeAI({ apiKey: keys[i] });
            const result = await withBackoff(
                () => generateObject({ model: google('gemini-2.0-flash'), schema: OUTPUT_SCHEMA, prompt }),
                `Gemini-${i + 1}`, 3,
            );
            console.log(`✅ [Gemini ${i + 1}] Found ${result.object.scholarships.length} scholarships.`);
            return result.object.scholarships;
        } catch (err: any) {
            console.warn(`❌ [Gemini ${i + 1}] ${err?.message?.slice(0, 120)}`);
            if (i < keys.length - 1) await sleep(2000);
        }
    }

    // Groq Llama 70b
    try {
        console.log('🦙 [Tier 4 — Groq 70b] Parsing...');
        const result = await withBackoff(
            () => generateObject({ model: groq('llama-3.3-70b-versatile'), schema: OUTPUT_SCHEMA, prompt }),
            'Groq-70b', 2,
        );
        console.log(`✅ [Groq-70b] Found ${result.object.scholarships.length} scholarships.`);
        return result.object.scholarships;
    } catch (err: any) {
        console.warn(`❌ [Groq-70b] ${err?.message?.slice(0, 120)}`);
    }

    // Groq Llama 8b (last resort)
    try {
        console.log('🦙 [Tier 4 — Groq 8b] Last resort...');
        const result = await withBackoff(
            () => generateObject({ model: groq('llama-3.1-8b-instant'), schema: OUTPUT_SCHEMA, prompt }),
            'Groq-8b', 2,
        );
        console.log(`✅ [Groq-8b] Found ${result.object.scholarships.length} scholarships.`);
        return result.object.scholarships;
    } catch (err: any) {
        console.warn(`❌ [Groq-8b] ${err?.message?.slice(0, 120)}`);
    }

    console.error('🚨 All Tier 4 providers exhausted.');
    return [];
}

// ─── Rule-Based → Structured Scholarship ─────────────────────────────────────

function ruleBasedToScholarship(rb: RuleBasedResult, input: ParseScholarshipInput): ParsedScholarship {
    const tenYearsOut = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return {
        title: rb.title || input.title || 'Unknown Scholarship',
        provider: rb.provider || input.provider || 'Unknown Provider',
        amount: rb.amount ?? 0,
        deadline: rb.deadline || tenYearsOut,
        description: rb.description || input.descriptionSnippet || 'Scholarship details available on the official page.',
        eligibility: {
            title: rb.eligibilityTitle || (rb.gender === 'Female' ? 'Girls Scholarship' : 'Open Scholarship'),
            details: rb.eligibilityDetails || 'Please visit the official link for eligibility criteria.',
        },
        fieldOfStudy: rb.fieldOfStudy?.length ? rb.fieldOfStudy : ['General'],
        location: rb.location || 'india',
        eligibilityLevel: rb.eligibilityLevel?.length ? rb.eligibilityLevel : ['Undergraduate'],
        scholarshipType: rb.scholarshipType || 'Merit-based',
        gender: rb.gender || 'Female',
        religion: rb.religion || 'all',
    };
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export async function parseScholarshipFlow(input: ParseScholarshipInput): Promise<ParsedScholarship[]> {
    const rawContent = input.rawHtml || '';

    if (rawContent.trim().length < 100) {
        console.warn(`[parseScholarshipFlow] Payload too short (${rawContent.length} chars) for ${input.sourceUrl}. Skipping.`);
        return [];
    }

    const cleanText = sanitizePayload(rawContent);
    const todayISO = new Date().toISOString().split('T')[0];
    const tenYearsOut = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // ── Tier 1 + 2: Rule-Based Parsing (Free) ────────────────────────────────
    console.log(`[Tier 1+2] Running rule-based parse for ${input.sourceUrl.slice(0, 60)}...`);
    const ruleResult = ruleBasedParse(rawContent, input.sourceUrl);
    console.log(`[Tier 1+2] Confidence: ${ruleResult.confidence}/10 | Title: "${ruleResult.title?.slice(0, 40)}"`);

    // High confidence → save directly, no AI needed
    if (ruleResult.confidence >= 7) {
        console.log(`✅ [Tier 1+2] High confidence (${ruleResult.confidence}) — skipping AI entirely.`);
        return [ruleBasedToScholarship(ruleResult, input)];
    }

    // ── Tier 3: Cloudflare AI (Free) — fill gaps only ───────────────────────
    if (ruleResult.confidence >= 4) {
        console.log(`[Tier 3] Medium confidence (${ruleResult.confidence}) — using Cloudflare AI to fill gaps...`);
        const cfFilled = await fillMissingFieldsWithCloudflare(
            {
                title: ruleResult.title,
                provider: ruleResult.provider,
                amount: ruleResult.amount,
                deadline: ruleResult.deadline,
                description: ruleResult.description,
                eligibilityDetails: ruleResult.eligibilityDetails,
            },
            cleanText,
        );

        if (cfFilled && (cfFilled.title || cfFilled.deadline || cfFilled.description)) {
            const merged: RuleBasedResult = { ...ruleResult, ...cfFilled, confidence: 8 };
            console.log(`✅ [Tier 3] Cloudflare AI filled gaps successfully.`);
            return [ruleBasedToScholarship(merged, input)];
        }
        console.warn('[Tier 3] Cloudflare AI returned no usable data — escalating to Tier 4.');
    }

    // ── Tier 4: Full AI (Gemini → Groq) ─────────────────────────────────────
    console.log(`[Tier 4] Low confidence (${ruleResult.confidence}) — running full AI parse...`);
    const prompt = `Extract ALL scholarships from the text scraped from ${input.sourceUrl}.
Today: ${todayISO}. Always-open deadlines: use "${tenYearsOut}".
Amounts in INR. Unknown amount = 0. Deadline MUST be YYYY-MM-DD.
Return all scholarships in the array. Empty array if no real scholarships found.

Title hint: ${input.title}
Provider hint: ${input.provider}
Snippet: ${input.descriptionSnippet}

Scraped text:
${cleanText}`;

    try {
        const results = await tier4FullAIParse(prompt);
        return results;
    } catch (err: any) {
        console.error('[parseScholarshipFlow] All tiers failed:', err?.message);
        return [];
    }
}
