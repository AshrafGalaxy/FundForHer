import { ai } from '@/server/ai/genkit';
import { z } from 'genkit';

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

export const parseScholarshipFlow = ai.defineFlow(
    {
        name: 'parseScholarshipFlow',
        inputSchema: z.object({
            title: z.string(),
            provider: z.string(),
            descriptionSnippet: z.string(),
            sourceUrl: z.string(),
            rawHtml: z.string().optional(),
        }),
        outputSchema: z.array(ScholarshipOutputSchema),
    },
    async (input) => {
        const prompt = `
    Extract scholarship details from the following raw text/HTML scraped from ${input.sourceUrl}.
    Focus on extracting ALL relevant structured details.
    If the text describes multiple scholarships, return them all in the array.
    If it's garbage or not a scholarship, return an empty array.
    If the amount is not clearly specified in INR, set it to 0.
    Today's date is ${new Date().toISOString()}. Make sure the deadline is formatted as YYYY-MM-DD.

    Raw Data:
    Title: ${input.title}
    Provider: ${input.provider}
    Snippet: ${input.descriptionSnippet}
    HTML: ${input.rawHtml || ''}
    `;

        const response = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            prompt: prompt,
            output: { schema: z.array(ScholarshipOutputSchema) }
        });

        if (!response.output) {
            return [];
        }

        return response.output;
    }
);
