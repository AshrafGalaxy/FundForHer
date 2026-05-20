import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';

const oddsSchema = z.object({
  matchPercentage: z.number().min(0).max(100).describe("A realistic calculation of how well the student matches the criteria."),
  isEligible: z.boolean().describe("True if they meet the absolute baseline criteria, false if there is a hard disqualifier."),
  rejectionRisks: z.array(z.string()).describe("A brutally honest list of specific reasons they might be rejected (e.g., 'Family income exceeds 2LPA', 'Missing specific caste requirement'). Empty array if perfectly matched.")
});

export async function POST(req: Request) {
  try {
    const { scholarshipData, userProfile } = await req.json();

    if (!scholarshipData || !userProfile) {
      return NextResponse.json({ error: 'Missing required data payload' }, { status: 400 });
    }

    const systemPrompt = `You are an expert, highly strict scholarship compliance officer. 
Your objective is to cross-reference the provided Student Profile against the provided Scholarship Requirements. 
You must look for any discrepancies in age, location, gender, academic field, caste, or financial income. 
Be brutally honest. If data is missing from the student's profile (e.g., no income provided), list that as a specific verification risk.
Output strictly in the requested JSON format.`;

    const { object } = await generateObject({
      model: groq('llama-3.1-8b-instant'),
      schema: oddsSchema,
      system: systemPrompt,
      prompt: `Scholarship Requirements:\n${JSON.stringify(scholarshipData, null, 2)}\n\nStudent Profile:\n${JSON.stringify(userProfile, null, 2)}`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Error in check-odds AI route:", error);
    return NextResponse.json({ error: 'Failed to process AI odds request' }, { status: 500 });
  }
}
