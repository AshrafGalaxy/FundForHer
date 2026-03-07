export interface RawScholarship {
    title: string;
    provider: string;
    amount?: string;
    deadline?: string;
    descriptionSnippet: string;
    sourceUrl: string;
    rawHtml?: string;
    tags?: string[];
}

export interface ScraperResult {
    source: string;
    scholarships: RawScholarship[];
    scrapedAt: Date;
    errors?: string[];
}
