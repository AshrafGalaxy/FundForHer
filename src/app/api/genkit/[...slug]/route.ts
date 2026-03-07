export const dynamic = 'force-dynamic';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { NextResponse } from 'next/server';

export const ai = genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.0-flash',
});

// Manual Next.js App Router API wrapper instead of nextJSHandler/createHandler
export async function POST(req: Request) {
    try {
        const body = await req.json();
        return NextResponse.json({ message: "Genkit API route live. Please call flows directly." });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: "Genkit API Route Active" });
}
