import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { scrapeUrlWithFirecrawl } from '../src/server/scraper/firecrawl-scraper';
import { parseScholarshipFlow } from '../src/server/ai/flows/parse-scholarship-flow';

async function testScrapeAndParse() {
    const testUrl = 'https://www.buddy4study.com/scholarships/girls?page=1';
    console.log(`\n1. Scraping ${testUrl} with Firecrawl...`);
    
    try {
        const markdown = await scrapeUrlWithFirecrawl(testUrl);
        console.log(`✅ Scraped successfully. Length: ${markdown.length} characters.`);
        console.log(`Preview: ${markdown.substring(0, 500)}...\n`);
        
        console.log(`2. Parsing with Gemini AI...`);
        const parsed = await parseScholarshipFlow({
            title: "Unknown",
            provider: "Unknown",
            descriptionSnippet: "",
            sourceUrl: testUrl,
            rawHtml: markdown,
        });
        
        console.log(`✅ AI returned ${parsed.length} scholarships.`);
        if (parsed.length > 0) {
            console.log("Sample of first parsed scholarship:");
            console.log(JSON.stringify(parsed[0], null, 2));
        } else {
            console.log("❌ AI failed to find any scholarships in the text. This is why nothing is being saved!");
        }
    } catch (e: any) {
        console.error("Test failed:", e);
    }
}

testScrapeAndParse();
