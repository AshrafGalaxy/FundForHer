import dotenv from 'dotenv';
import { generateObject } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';

dotenv.config({ path: '.env.local' });

async function testKeys() {
    console.log("=== API KEY VERIFICATION TEST ===\n");
    let passed = 0;
    let failed = 0;

    // 1. Test Groq
    try {
        console.log("Testing Groq API...");
        const res = await generateObject({
            model: groq('llama-3.1-8b-instant'),
            schema: z.object({ success: z.boolean() }),
            prompt: "Return success as true.",
        });
        if (res.object.success) {
            console.log("✅ Groq API: Passed");
            passed++;
        } else {
            console.log("❌ Groq API: Failed (unexpected response)");
            failed++;
        }
    } catch (e: any) {
        console.log("❌ Groq API: Failed -", e.message);
        failed++;
    }

    // 2. Test Serper
    try {
        console.log("Testing Serper API...");
        const res = await fetch("https://google.serper.dev/search", {
            method: 'POST',
            headers: {
                "X-API-KEY": process.env.SERPER_API_KEY || '',
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ q: "test", num: 1 })
        });
        if (res.ok) {
            console.log("✅ Serper API: Passed");
            passed++;
        } else {
            console.log(`❌ Serper API: Failed with status ${res.status}`);
            failed++;
        }
    } catch (e: any) {
        console.log("❌ Serper API: Failed -", e.message);
        failed++;
    }

    // 3. Test Firecrawl (basic auth check)
    try {
        console.log("Testing Firecrawl API...");
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY || ''}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: "https://example.com" })
        });
        // 400 means it authenticated but missing params, 401 means auth failed
        if (res.status !== 401 && res.status !== 403) {
            console.log("✅ Firecrawl API: Passed");
            passed++;
        } else {
            console.log(`❌ Firecrawl API: Failed with status ${res.status} (Likely invalid key)`);
            failed++;
        }
    } catch (e: any) {
        console.log("❌ Firecrawl API: Failed -", e.message);
        failed++;
    }

    // 4. Test Resend
    try {
        console.log("Testing Resend API...");
        const res = await fetch("https://api.resend.com/emails", {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${process.env.RESEND_API_KEY || ''}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "onboarding@resend.dev",
                to: "test@example.com",
                subject: "Test",
                html: "<p>test</p>"
            })
        });
        const data = await res.json();
        if (res.ok || (res.status === 403 && data.message.includes('domain'))) {
             // 403 domain error means the key is valid but the domain isn't verified, which still means auth succeeded.
             console.log("✅ Resend API: Passed (Auth valid)");
             passed++;
        } else if (res.ok) {
             console.log("✅ Resend API: Passed");
             passed++;
        } else {
            console.log(`❌ Resend API: Failed - ${data.message}`);
            failed++;
        }
    } catch (e: any) {
        console.log("❌ Resend API: Failed -", e.message);
        failed++;
    }

    // 5. Test Algolia (Search Key)
    try {
        console.log("Testing Algolia Search API...");
        const res = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes`, {
            method: 'GET',
            headers: {
                "X-Algolia-Application-Id": process.env.ALGOLIA_APP_ID || '',
                "X-Algolia-API-Key": process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || ''
            }
        });
        if (res.ok) {
            console.log("✅ Algolia Search API: Passed");
            passed++;
        } else {
            console.log(`❌ Algolia Search API: Failed with status ${res.status}`);
            failed++;
        }
    } catch (e: any) {
        console.log("❌ Algolia Search API: Failed -", e.message);
        failed++;
    }

    // 6. Test Algolia (Admin Key)
    try {
        console.log("Testing Algolia Admin API...");
        const res = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes`, {
            method: 'GET',
            headers: {
                "X-Algolia-Application-Id": process.env.ALGOLIA_APP_ID || '',
                "X-Algolia-API-Key": process.env.ALGOLIA_ADMIN_KEY || ''
            }
        });
        if (res.ok) {
            console.log("✅ Algolia Admin API: Passed");
            passed++;
        } else {
            console.log(`❌ Algolia Admin API: Failed with status ${res.status}`);
            failed++;
        }
    } catch (e: any) {
        console.log("❌ Algolia Admin API: Failed -", e.message);
        failed++;
    }

    // 7. Test Sentry Auth Token
    try {
        console.log("Testing Sentry API...");
        const res = await fetch("https://sentry.io/api/0/", {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${process.env.SENTRY_AUTH_TOKEN || ''}`
            }
        });
        if (res.ok) {
            console.log("✅ Sentry API: Passed");
            passed++;
        } else {
            console.log(`❌ Sentry API: Failed with status ${res.status} (Likely invalid Auth Token)`);
            failed++;
        }
    } catch (e: any) {
        console.log("❌ Sentry API: Failed -", e.message);
        failed++;
    }

    // 8. Test Inngest Event Key
    try {
        console.log("Testing Inngest Event API...");
        const eventKey = process.env.INNGEST_EVENT_KEY || '';
        // We can test the event key by sending a dummy event (it won't break anything, just log in their dashboard)
        const res = await fetch(`https://inn.gs/e/${eventKey}`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: "test/key-verification",
                data: { message: "Testing key validity" }
            })
        });
        if (res.ok) {
            console.log("✅ Inngest Event API: Passed");
            passed++;
        } else {
            console.log(`❌ Inngest Event API: Failed with status ${res.status}`);
            failed++;
        }
    } catch (e: any) {
        console.log("❌ Inngest Event API: Failed -", e.message);
        failed++;
    }
    
    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
}

testKeys();
