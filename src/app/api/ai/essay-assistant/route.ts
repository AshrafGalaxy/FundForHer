import { groq } from '@ai-sdk/groq';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { prompt, essay, scholarshipInfo } = await req.json();

        const result = await streamText({
            model: groq('llama-3.1-8b-instant'),
            system: `You are an expert scholarship essay consultant. Your goal is to provide ONLY one or two short, punchy tips to improve the user's ongoing essay. 
      Keep your advice under 40 words total. Do not write the essay for them. 
      
      Focus on structure, action verbs, and answering the prompt.
      
      Scholarship Details Context:
      Title: ${scholarshipInfo?.title || 'Unknown'}
      Provider: ${scholarshipInfo?.provider || 'Unknown'}
      Criteria: ${scholarshipInfo?.eligibility?.details || 'Unknown'}
      `,
            messages: [
                { role: 'user', content: `Here is my current essay draft:\n\n${essay || '(Empty)'}\n\nUser Request: ${prompt}` }
            ],
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('Groq AI Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate tips' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
