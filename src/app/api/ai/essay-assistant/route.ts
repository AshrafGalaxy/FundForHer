import { groq } from '@ai-sdk/groq';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { prompt, essay, scholarshipInfo, applicantContext } = await req.json();

        const applicantSummary = applicantContext
            ? `
Applicant Context:
- Field of Study: ${applicantContext.field || 'Not specified'}
- Education Level: ${applicantContext.level || 'Not specified'}
- CGPA / Marks: ${applicantContext.cgpa || 'Not specified'}
- Skills: ${applicantContext.skills || 'Not specified'}
- Achievements: ${applicantContext.achievements || 'None listed'}
`
            : '';

        const result = await streamText({
            model: groq('llama-3.1-8b-instant'),
            system: `You are an expert scholarship essay consultant for Indian students.
Your goal is to give ONE punchy, specific, actionable tip (max 40 words) to improve the user's essay.
Do NOT write the essay for them. Reference their actual profile details when possible.
Focus on: specificity, impact, authenticity, and alignment with the scholarship mission.

Scholarship Context:
- Title: ${scholarshipInfo?.title || 'Unknown'}
- Provider: ${scholarshipInfo?.provider || 'Unknown'}
- Eligibility Criteria: ${scholarshipInfo?.eligibility?.details || 'Not specified'}
${applicantSummary}`,
            messages: [
                {
                    role: 'user',
                    content: `Here is my current essay draft:\n\n${essay || '(Empty)'}\n\nUser Request: ${prompt}`
                }
            ],
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('Groq AI Error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to generate tips. Please try again.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
