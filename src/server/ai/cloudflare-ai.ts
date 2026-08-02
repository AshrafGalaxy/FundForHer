/**
 * Cloudflare Workers AI client.
 * Uses Cloudflare's completely FREE inference API (no rate-limit issues).
 * Models: @cf/meta/llama-3.1-8b-instruct
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID  — your Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN   — API token with "Workers AI" read permission
 */

const CF_AI_BASE = 'https://api.cloudflare.com/client/v4/accounts';
const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct';

interface CFAIResponse {
    success: boolean;
    result?: { response: string };
    errors?: { message: string }[];
}

/**
 * Calls Cloudflare Workers AI with a prompt and returns raw text.
 * Returns null if credentials are not configured.
 */
export async function callCloudflareAI(prompt: string): Promise<string | null> {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
        console.warn('⚠️ [Cloudflare AI] Credentials not set — skipping Tier 3.');
        return null;
    }

    try {
        const url = `${CF_AI_BASE}/${accountId}/ai/run/${CF_MODEL}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a scholarship data extractor. Always respond with valid JSON only. No explanations, no markdown fences.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                max_tokens: 1024,
            }),
            signal: AbortSignal.timeout(20_000), // 20 second timeout
        });

        if (!response.ok) {
            console.warn(`⚠️ [Cloudflare AI] HTTP ${response.status}: ${await response.text()}`);
            return null;
        }

        const data: CFAIResponse = await response.json();

        if (!data.success || !data.result?.response) {
            console.warn('[Cloudflare AI] Returned failure:', JSON.stringify(data.errors));
            return null;
        }

        return data.result.response;
    } catch (err: any) {
        console.warn('[Cloudflare AI] Request failed:', err.message);
        return null;
    }
}

/**
 * Uses Cloudflare AI to fill in missing fields from a partial rule-based result.
 * Targets only the missing fields, keeping the prompt tiny.
 */
export async function fillMissingFieldsWithCloudflare(
    partial: {
        title?: string;
        provider?: string;
        amount?: number;
        deadline?: string;
        description?: string;
        eligibilityDetails?: string;
    },
    scrapedText: string,
): Promise<Partial<typeof partial>> {
    const missingFields = Object.entries(partial)
        .filter(([, v]) => v === undefined || v === null || v === '')
        .map(([k]) => k);

    if (missingFields.length === 0) return partial;

    const truncatedText = scrapedText.slice(0, 4000);
    const prompt = `From the following scholarship page text, extract ONLY these missing fields as JSON: ${missingFields.join(', ')}.
If a field cannot be found, use null.
Today: ${new Date().toISOString().split('T')[0]}.
Text:
${truncatedText}

Respond with ONLY a JSON object like: {"title": "...", "provider": "...", "deadline": "YYYY-MM-DD", "amount": 0}`;

    const rawResponse = await callCloudflareAI(prompt);
    if (!rawResponse) return {};

    try {
        // Extract JSON from the response (strip any accidental prose)
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return {};
        return JSON.parse(jsonMatch[0]);
    } catch {
        console.warn('[Cloudflare AI] Failed to parse JSON response:', rawResponse.slice(0, 200));
        return {};
    }
}
