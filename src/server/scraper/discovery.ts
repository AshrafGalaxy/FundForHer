export async function discoverScholarships(query: string = "new scholarships for women in india 2026"): Promise<string[]> {
    if (!process.env.SERPER_API_KEY) {
        console.error("⚠️ SERPER_API_KEY is missing. Cannot perform discovery.");
        return [];
    }

    console.log(`🔍 Discovering scholarships via Serper.dev for query: "${query}"`);

    const myHeaders = new Headers();
    myHeaders.append("X-API-KEY", process.env.SERPER_API_KEY);
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
        "q": query,
        "num": 20 // Grab top 20 results
    });

    const requestOptions: RequestInit = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    try {
        const response = await fetch("https://google.serper.dev/search", requestOptions);
        const result = await response.json();

        if (result.organic && Array.isArray(result.organic)) {
            // Extract just the links
            const links = result.organic.map((item: any) => item.link);
            return links;
        }
        return [];
    } catch (error) {
        console.error("Search API Error:", error);
        return [];
    }
}
