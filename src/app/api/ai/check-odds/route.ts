import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const oddsSchema = z.object({
  matchPercentage: z
    .number()
    .min(0)
    .max(100)
    .describe('A realistic integer score (0-100) representing how well this student matches the scholarship. 100 = perfect match, 0 = hard disqualified.'),
  isEligible: z
    .boolean()
    .describe('True only if the student meets the absolute minimum criteria. False if there is even one hard disqualifier.'),
  rejectionRisks: z
    .array(z.string())
    .describe(
      'A list of specific, actionable rejection risks or missing information (e.g. "Your stated field of study (Commerce) does not match the required Engineering/Medical field"). Return an empty array only if the profile is a perfect match.'
    ),
});

const SYSTEM_PROMPT = `You are a strict, expert scholarship compliance officer at a top Indian university.
Your job is to analyze a student profile against a scholarship's requirements and produce an honest eligibility assessment.

Rules:
- Be SPECIFIC. Reference actual values from both the profile and requirements (e.g. "Student's age is 22, but this scholarship requires students aged 18-21").
- Flag ALL missing fields in the profile as risks (e.g. "Annual family income not provided — this is a required field").
- If the student's field of study does not match, flag it clearly.
- Set isEligible to false if ANY hard requirement is not met or cannot be verified.
- matchPercentage should reflect only verifiable matches. Missing data reduces the score.
- Output only valid JSON matching the schema. Do not include explanations outside the JSON.`;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !body.scholarshipData || !body.userProfile) {
      return NextResponse.json(
        { error: 'Missing required data payload: scholarshipData and userProfile are required.' },
        { status: 400 }
      );
    }

    const { scholarshipData, userProfile } = body;

    // Validate that profile has at least some meaningful data
    const profileKeys = Object.keys(userProfile).filter(k => userProfile[k] != null && userProfile[k] !== '');
    if (profileKeys.length === 0) {
      return NextResponse.json(
        { error: 'User profile appears to be empty. Please complete your profile before checking odds.' },
        { status: 400 }
      );
    }

    const prompt = `SCHOLARSHIP REQUIREMENTS:
${JSON.stringify(scholarshipData, null, 2)}

STUDENT PROFILE:
${JSON.stringify(userProfile, null, 2)}

Analyze the student profile against the scholarship requirements and produce an eligibility assessment.`;

    // Try primary model first, fall back to a more reliable one on failure
    let object;
    try {
      const result = await generateObject({
        model: groq('llama-3.3-70b-versatile'),
        schema: oddsSchema,
        system: SYSTEM_PROMPT,
        prompt,
      });
      object = result.object;
    } catch (primaryErr: any) {
      console.warn('[check-odds] Primary model failed, trying fallback:', primaryErr?.message);
      // Fallback to the 8b model
      const fallbackResult = await generateObject({
        model: groq('llama-3.1-8b-instant'),
        schema: oddsSchema,
        system: SYSTEM_PROMPT,
        prompt,
      });
      object = fallbackResult.object;
    }

    return NextResponse.json(object);
  } catch (error: any) {
    console.error('[check-odds] Critical error:', error?.message ?? error);
    // Return a structured error that the frontend can display meaningfully
    return NextResponse.json(
      {
        error: 'AI analysis failed.',
        detail: error?.message ?? 'Unknown error. Please try again.',
      },
      { status: 500 }
    );
  }
}
