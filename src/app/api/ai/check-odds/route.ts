import { NextResponse } from 'next/server';
import { generateObject, generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

// ── Schema ─────────────────────────────────────────────────────────────────
// NOTE: strengths & recommendation are .optional() so the model never fails
// validation just because it omitted them. matchPercentage uses transform to
// round any decimal the model might produce to an integer.
const oddsSchema = z.object({
  matchPercentage: z
    .number()
    .min(0)
    .max(100)
    .transform(Math.round)
    .describe('Integer 0-100 representing how well the student matches the scholarship.'),
  isEligible: z
    .boolean()
    .describe('True only if the student meets ALL absolute minimum criteria.'),
  rejectionRisks: z
    .array(z.string())
    .describe('Specific, actionable rejection risks. Empty array if perfect match.'),
  strengths: z
    .array(z.string())
    .optional()
    .describe('2-4 reasons why this student is a strong candidate.'),
  recommendation: z
    .string()
    .optional()
    .describe('One concise sentence advising the student on their next best action.'),
});

type OddsResult = z.infer<typeof oddsSchema>;

// ── System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a strict, expert scholarship compliance officer.
Analyze the student profile against the scholarship requirements honestly.

Rules:
- Be SPECIFIC — reference actual values from the profile and requirements.
- Flag ALL missing required fields as risks.
- isEligible = false if ANY hard requirement is unmet or unverifiable.
- matchPercentage must be an integer 0-100.
- Populate strengths (2-4 items) and recommendation (1 sentence) when possible.
- Return only valid JSON matching the schema.`;

// ── Fallback: generateText + manual JSON extraction ─────────────────────────
async function tryGenerateText(model: any, system: string, prompt: string): Promise<OddsResult> {
  const { text } = await generateText({ model, system, prompt });

  // Extract JSON from markdown code block if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error('Model did not return parseable JSON.');

  const parsed = JSON.parse(jsonMatch[1]);
  return oddsSchema.parse(parsed);
}

// ── Handler ─────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'AI service not configured. Add GROQ_API_KEY to environment variables.' },
      { status: 503 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body?.scholarshipData || !body?.userProfile) {
    return NextResponse.json(
      { error: 'Missing required fields: scholarshipData and userProfile.' },
      { status: 400 },
    );
  }

  const { scholarshipData, userProfile } = body;

  const profileKeys = Object.keys(userProfile).filter(
    k => userProfile[k] != null && userProfile[k] !== '',
  );
  if (profileKeys.length === 0) {
    return NextResponse.json(
      { error: 'Your profile is empty. Please complete your profile in Settings first.' },
      { status: 400 },
    );
  }

  const prompt = `SCHOLARSHIP REQUIREMENTS:\n${JSON.stringify(scholarshipData, null, 2)}\n\nSTUDENT PROFILE:\n${JSON.stringify(userProfile, null, 2)}\n\nProduce an eligibility assessment.`;

  const models = [
    groq('llama-3.3-70b-versatile'),
    groq('llama-3.1-8b-instant'),
  ];

  for (const model of models) {
    const modelId = (model as any).modelId ?? 'unknown';

    // Strategy 1: generateObject (structured, strict)
    try {
      const { object } = await generateObject({
        model,
        schema: oddsSchema,
        system: SYSTEM_PROMPT,
        prompt,
      });
      console.log(`[check-odds] ✅ generateObject succeeded with ${modelId}`);
      return NextResponse.json(object);
    } catch (err1: any) {
      console.warn(`[check-odds] generateObject failed (${modelId}):`, err1?.message);
    }

    // Strategy 2: generateText + manual JSON parse (more lenient)
    try {
      const result = await tryGenerateText(model, SYSTEM_PROMPT, prompt);
      console.log(`[check-odds] ✅ generateText fallback succeeded with ${modelId}`);
      return NextResponse.json(result);
    } catch (err2: any) {
      console.warn(`[check-odds] generateText fallback failed (${modelId}):`, err2?.message);
    }
  }

  // All strategies and models exhausted
  console.error('[check-odds] All models and strategies failed.');
  return NextResponse.json(
    { error: 'AI analysis could not be completed. Both Groq models failed. Please try again in a moment.' },
    { status: 500 },
  );
}
