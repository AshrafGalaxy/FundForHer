import * as cheerio from 'cheerio';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RuleBasedResult {
    title?: string;
    provider?: string;
    amount?: number;
    deadline?: string;
    description?: string;
    location?: string;
    gender?: string;
    eligibilityLevel?: string[];
    fieldOfStudy?: string[];
    scholarshipType?: string;
    religion?: string;
    eligibilityTitle?: string;
    eligibilityDetails?: string;
    /** 0–10. >= 7 = save directly. 4–6 = use cheap AI to fill gaps. < 4 = full AI. */
    confidence: number;
}

// ─── Regex Patterns ───────────────────────────────────────────────────────────

const AMOUNT_PATTERNS = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\s*,\s*\d+)*(?:\.\d{1,2})?)/gi,
    /([\d,]+)\s*(?:rupees?|inr)/gi,
    /scholarship\s+(?:of|worth|amount)\s+(?:rs\.?|inr|₹)?\s*([\d,]+)/gi,
];

const DATE_PATTERNS = [
    // DD Month YYYY  e.g. "31 December 2026"
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi,
    // Month DD, YYYY e.g. "December 31, 2026"
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/gi,
    // DD/MM/YYYY or DD-MM-YYYY
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,
    // YYYY-MM-DD (ISO)
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
];

const MONTH_MAP: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
};

const GENDER_PATTERNS = [
    { re: /\b(girls?|women?|female|lady|ladies)\b/gi, value: 'Female' },
    { re: /\b(boys?|men?|male)\b/gi, value: 'Male' },
];

const LEVEL_KEYWORDS: Record<string, string[]> = {
    'Undergraduate': ['undergraduate', 'ug', 'bachelor', 'b\.tech', 'b\.sc', 'ba ', 'bca', 'b\.com', 'degree', 'graduation'],
    'Postgraduate': ['postgraduate', 'pg', 'master', 'm\.tech', 'm\.sc', 'ma ', 'mca', 'mba', 'post-graduation'],
    'PhD': ['phd', 'doctorate', 'doctoral', 'research scholar'],
    'Diploma': ['diploma', 'polytechnic'],
    'Class 10': ['class 10', '10th', 'ssc', 'matric'],
    'Class 12': ['class 12', '12th', 'hsc', 'intermediate', 'senior secondary'],
    'Class 9': ['class 9', '9th'],
};

const FIELD_KEYWORDS: Record<string, string[]> = {
    'Engineering': ['engineering', 'b.tech', 'technical', 'technology', 'iit', 'nit'],
    'Medicine': ['medicine', 'mbbs', 'medical', 'nursing', 'pharmacy', 'bds', 'health science'],
    'Law': ['law', 'llb', 'legal'],
    'Arts': ['arts', 'humanities', 'history', 'geography', 'literature'],
    'Commerce': ['commerce', 'accounting', 'finance', 'mba', 'b.com', 'economics'],
    'Science': ['science', 'b.sc', 'physics', 'chemistry', 'biology', 'mathematics'],
    'Agriculture': ['agriculture', 'agri', 'horticulture'],
    'General': ['any course', 'all courses', 'any stream', 'all streams', 'meritorious'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAmountFromText(text: string): number | undefined {
    for (const pattern of AMOUNT_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(text);
        if (match) {
            const num = parseInt(match[1].replace(/[\s,]/g, ''), 10);
            if (!isNaN(num) && num > 0 && num < 100_000_000) return num;
        }
    }
    return undefined;
}

function parseDateFromText(text: string): string | undefined {
    const now = new Date();

    // Try ISO format first (most reliable)
    const isoMatch = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
    if (isoMatch) {
        const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`);
        if (!isNaN(d.getTime()) && d > now) return d.toISOString().split('T')[0];
    }

    // "DD Month YYYY"
    const longMatch1 = /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i.exec(text);
    if (longMatch1) {
        const day = longMatch1[1].padStart(2, '0');
        const month = MONTH_MAP[longMatch1[2].toLowerCase()];
        const d = new Date(`${longMatch1[3]}-${month}-${day}`);
        if (!isNaN(d.getTime()) && d > now) return d.toISOString().split('T')[0];
    }

    // "Month DD, YYYY"
    const longMatch2 = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i.exec(text);
    if (longMatch2) {
        const month = MONTH_MAP[longMatch2[1].toLowerCase()];
        const day = longMatch2[2].padStart(2, '0');
        const d = new Date(`${longMatch2[3]}-${month}-${day}`);
        if (!isNaN(d.getTime()) && d > now) return d.toISOString().split('T')[0];
    }

    // DD/MM/YYYY
    const slashMatch = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/.exec(text);
    if (slashMatch) {
        const d = new Date(`${slashMatch[3]}-${slashMatch[2].padStart(2,'0')}-${slashMatch[1].padStart(2,'0')}`);
        if (!isNaN(d.getTime()) && d > now) return d.toISOString().split('T')[0];
    }

    return undefined;
}

function extractKeywords<T extends string>(text: string, map: Record<T, string[]>): T[] {
    const lower = text.toLowerCase();
    const results: T[] = [];
    for (const [key, keywords] of Object.entries(map) as [T, string[]][]) {
        if (keywords.some(kw => lower.includes(kw))) {
            results.push(key);
        }
    }
    return results;
}

// ─── JSON-LD / Schema.org Extractor ──────────────────────────────────────────

function extractJsonLd(html: string): Partial<RuleBasedResult> | null {
    const $ = cheerio.load(html);
    const result: Partial<RuleBasedResult> = {};
    let found = false;

    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const raw = $(el).html() || '';
            const data = JSON.parse(raw);
            const entries = Array.isArray(data) ? data : [data];

            for (const entry of entries) {
                const type = (entry['@type'] || '').toLowerCase();
                if (type.includes('scholarship') || type.includes('event') || type.includes('webpage')) {
                    if (entry.name && !result.title) { result.title = entry.name; found = true; }
                    if (entry.description && !result.description) result.description = entry.description;
                    if (entry.provider?.name && !result.provider) result.provider = entry.provider.name;
                    if (entry.organizer?.name && !result.provider) result.provider = entry.organizer.name;
                    if (entry.offers?.price && !result.amount) result.amount = parseInt(entry.offers.price, 10);
                    if (entry.endDate && !result.deadline) {
                        const d = new Date(entry.endDate);
                        if (!isNaN(d.getTime())) result.deadline = d.toISOString().split('T')[0];
                    }
                }
            }
        } catch { /* ignore malformed JSON-LD */ }
    });

    return found ? result : null;
}

// ─── Open Graph / Meta Extractor ─────────────────────────────────────────────

function extractMeta(html: string): Partial<RuleBasedResult> {
    const $ = cheerio.load(html);
    const result: Partial<RuleBasedResult> = {};

    const getAttr = (selector: string, attr: string) =>
        $(selector).first().attr(attr)?.trim() || '';

    result.title = result.title ||
        getAttr('meta[property="og:title"]', 'content') ||
        getAttr('meta[name="twitter:title"]', 'content') ||
        $('h1').first().text().trim();

    result.description = result.description ||
        getAttr('meta[property="og:description"]', 'content') ||
        getAttr('meta[name="description"]', 'content');

    result.provider = result.provider ||
        getAttr('meta[property="og:site_name"]', 'content');

    return result;
}

// ─── Main Rule-Based Parser ───────────────────────────────────────────────────

export function ruleBasedParse(html: string, sourceUrl: string): RuleBasedResult {
    const $ = cheerio.load(html);
    // Remove noise
    $('script, style, nav, footer, header, .menu, .sidebar, iframe').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    // Tier 1: Try JSON-LD first
    const jsonLdData = extractJsonLd(html);
    // Tier 1b: Meta/OG tags
    const metaData = extractMeta(html);

    // Merge: JSON-LD wins, then meta, then regex
    const merged: RuleBasedResult = {
        title: jsonLdData?.title || metaData?.title,
        provider: jsonLdData?.provider || metaData?.provider,
        description: jsonLdData?.description || metaData?.description,
        amount: jsonLdData?.amount,
        deadline: jsonLdData?.deadline,
        confidence: 0,
    };

    // Tier 2: Regex on body text for missing fields
    if (!merged.amount) merged.amount = parseAmountFromText(bodyText);
    if (!merged.deadline) merged.deadline = parseDateFromText(bodyText);

    // Extract gender
    for (const { re, value } of GENDER_PATTERNS) {
        re.lastIndex = 0;
        if (re.test(bodyText)) { merged.gender = value; break; }
    }
    if (!merged.gender) merged.gender = 'all';

    // Extract location (India-centric)
    const indiaStates = ['maharashtra', 'delhi', 'karnataka', 'gujarat', 'rajasthan', 'uttar pradesh',
        'kerala', 'tamil nadu', 'andhra pradesh', 'telangana', 'punjab', 'haryana'];
    const lowerBody = bodyText.toLowerCase();
    const stateFound = indiaStates.find(s => lowerBody.includes(s));
    merged.location = stateFound || 'india';

    // Extract eligibility levels
    merged.eligibilityLevel = extractKeywords(bodyText, LEVEL_KEYWORDS);
    if (!merged.eligibilityLevel.length) merged.eligibilityLevel = ['Undergraduate'];

    // Extract fields of study
    merged.fieldOfStudy = extractKeywords(bodyText, FIELD_KEYWORDS);
    if (!merged.fieldOfStudy.length) merged.fieldOfStudy = ['General'];

    // Extract scholarship type
    if (lowerBody.includes('merit')) merged.scholarshipType = 'Merit-based';
    else if (lowerBody.includes('financial need') || lowerBody.includes('income')) merged.scholarshipType = 'Financial Need';
    else if (lowerBody.includes('minority')) merged.scholarshipType = 'Minority';
    else if (lowerBody.includes('disability') || lowerBody.includes('differently abled')) merged.scholarshipType = 'Disability';
    else merged.scholarshipType = 'Merit-based';

    // Extract eligibility text (first paragraph under an "eligibility" heading)
    let eligibilityText = '';
    $('h2, h3, h4').each((_, el) => {
        const headingText = $(el).text().toLowerCase();
        if (headingText.includes('eligib') || headingText.includes('who can apply')) {
            const next = $(el).nextUntil('h2, h3, h4').text().trim();
            if (next.length > 20) { eligibilityText = next.slice(0, 500); return false; }
        }
    });
    merged.eligibilityTitle = merged.gender === 'Female'
        ? `${merged.eligibilityLevel[0] || 'Student'} Girls`
        : `${merged.eligibilityLevel[0] || 'Students'}`;
    merged.eligibilityDetails = eligibilityText || `Open to ${merged.gender === 'Female' ? 'female' : 'all'} students in India.`;

    // ── Calculate confidence score ────────────────────────────────────────────
    let score = 0;
    if (merged.title && merged.title.length > 5) score += 3;
    if (merged.provider && merged.provider.length > 2) score += 2;
    if (merged.amount && merged.amount > 0) score += 2;
    if (merged.deadline) score += 2;
    if (merged.description && merged.description.length > 50) score += 1;
    merged.confidence = Math.min(score, 10);

    return merged;
}
