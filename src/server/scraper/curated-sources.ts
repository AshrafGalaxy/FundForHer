/**
 * CURATED STATIC SCHOLARSHIP SOURCES
 *
 * These are government and trusted non-JS-rendered pages that a plain fetch()
 * can parse reliably. Buddy4Study/NSP/VidyaSaarathi listing pages are
 * JavaScript-rendered SPAs — they are replaced by individual static scholarship
 * detail pages discovered via Serper, plus these known static sources.
 */
export const CURATED_STATIC_URLS: string[] = [
    // National Scholarship Portal — static government pages
    'https://scholarships.gov.in/public/schemeGuidelines/NSP_Scheme_List.pdf',
    'https://www.buddy4study.com/scholarships/girls?page=1',
    'https://www.buddy4study.com/scholarships/girls?page=2',
    'https://www.scholarshipsinindia.com/scholarships-for-girls.html',
    'https://www.scholarshipsinindia.com/national-scholarships.html',
    'https://www.ugc.gov.in/page/Scholarships-and-Fellowships.aspx',
    'https://aicte-india.org/schemes/students-development-schemes/PG-Scholarship-Scheme',
    'https://www.maef.nic.in/',
    'https://www.birlafoundation.org/scholarship.php',
    'https://www.centralsectorscheme.nic.in/',
    'https://www.india.gov.in/spotlight/national-scholarship-portal',
];

/**
 * Serper search queries tuned for active, open scholarships for girls in India.
 * Multiple queries widen the discovery net across different scholarship categories.
 */
export const DISCOVERY_QUERIES: string[] = [
    'scholarships for girls india 2026 apply now open',
    'women scholarship india 2026 site:buddy4study.com',
    'girl student scholarship india 2025-2026 open applications',
    'minority women scholarship india 2026',
    'merit scholarship girls undergraduate india 2026',
];
