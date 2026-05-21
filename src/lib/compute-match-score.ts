// src/lib/compute-match-score.ts
// Deterministic weighted eligibility scorer — runs client-side, zero AI calls per card.

import type { Scholarship } from '@/lib/types';
import type { UserProfile } from '@/server/db/user-data';

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalise(v: string | string[] | null | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(s => s.toLowerCase().trim());
  return [v.toLowerCase().trim()];
}

function isOpen(values: string[]): boolean {
  return values.length === 0 || values.some(v => v === 'all' || v === 'any' || v === 'open' || v === '');
}

/** 1.0 = full match, 0.5 = partial (open/any), 0.0 = mismatch */
function categoryScore(schValues: string[], profileValues: string[]): number {
  if (schValues.length === 0 || isOpen(schValues)) return 1.0;
  if (profileValues.length === 0) return 0.3;
  const match = schValues.some(s => profileValues.some(p => p === s || p.includes(s) || s.includes(p)));
  return match ? 1.0 : 0.0;
}

function singleScore(schVal: string | null | undefined, profileVal: string | null | undefined): number {
  if (!schVal || schVal.toLowerCase() === 'all' || schVal.toLowerCase() === 'any') return 1.0;
  if (!profileVal) return 0.3;
  return schVal.toLowerCase() === profileVal.toLowerCase() ? 1.0 : 0.0;
}

/** Attempt to extract a minimum CGPA from the eligibility details string */
function extractMinCgpa(eligibilityText: string | undefined): number | null {
  if (!eligibilityText) return null;
  const patterns = [
    /(?:minimum|min\.?|at least)\s*(?:cgpa|gpa)\s*(?:of)?\s*(\d+(?:\.\d+)?)/i,
    /cgpa\s*(?:>=?|≥|above|over)\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:cgpa|gpa)\s*(?:or|and)?\s*(?:above|more)/i,
    /minimum\s+(\d+(?:\.\d+)?)\s*%/i,
    /(\d{2,3})\s*%\s*(?:or)?\s*(?:above|more)/i,
  ];
  for (const pat of patterns) {
    const m = eligibilityText.match(pat);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

function bestCgpa(profile: UserProfile): number | null {
  const entries = profile.educationEntries ?? [];
  const cgpas = entries
    .map(e => {
      // score can be CGPA (e.g. 8.5) or Percentage (e.g. 85)
      const v = parseFloat(String(e.score ?? ''));
      return isNaN(v) ? null : v;
    })
    .filter((v): v is number => v !== null);

  if (cgpas.length > 0) return Math.max(...cgpas);

  // Fallback: old flat field
  const flat = parseFloat(String((profile as any).cgpa ?? ''));
  return isNaN(flat) ? null : flat;
}

function bestEducationLevel(profile: UserProfile): string[] {
  const entries = profile.educationEntries ?? [];
  const levels = entries.map(e => (e.degreeLevel ?? '').toLowerCase()).filter(Boolean);

  // Also check old flat field
  const flat = ((profile as any).educationLevel ?? (profile as any).qualification ?? '').toLowerCase();
  if (flat) levels.push(flat);

  return [...new Set(levels)];
}

function profileFieldsOfStudy(profile: UserProfile): string[] {
  const entries = profile.educationEntries ?? [];
  // specialisation is the field/stream in the new schema
  const fields = entries.map(e => (e.specialisation ?? '').toLowerCase()).filter(Boolean);

  const tags = normalise((profile as any).fieldOfStudy);
  return [...new Set([...fields, ...tags])];
}

// ── Education level mapping ───────────────────────────────────────────────────
// Maps scholarship eligibility levels to profile degreeLevel enum values
const LEVEL_MAP: Record<string, string[]> = {
  'class 10':       ['class 10', '10th', 'secondary', 'ssc', 'matric'],
  'class 12':       ['class 12', '12th', 'higher secondary', 'hsc', 'intermediate', 'senior secondary'],
  'undergraduate':  ['ug', 'undergraduate', 'bachelor', 'b.tech', 'b.e', 'bsc', 'bcom', 'ba', 'bca', 'bba', 'integrated', 'dual degree'],
  'postgraduate':   ['pg', 'postgraduate', 'master', 'm.tech', 'm.e', 'msc', 'mcom', 'ma', 'mca', 'mba', 'integrated', 'dual degree'],
  'phd':            ['phd', 'doctorate', 'doctoral', 'research scholar'],
  'diploma':        ['diploma', 'polytechnic', 'vocational', 'certificate'],
  'professional':   ['ug', 'pg', 'mbbs', 'llb', 'ca', 'cs', 'law', 'medical', 'engineering'],
};

function levelMatch(schLevels: string | string[], profileLevels: string[]): number {
  const sl = normalise(schLevels as any);
  if (sl.length === 0 || isOpen(sl)) return 1.0;
  if (profileLevels.length === 0) return 0.3;

  for (const sl_item of sl) {
    const bucket = LEVEL_MAP[sl_item] ?? [sl_item];
    if (profileLevels.some(pl => bucket.some(b => pl.includes(b) || b.includes(pl)))) {
      return 1.0;
    }
  }
  return 0.0;
}

// ── Main scorer ───────────────────────────────────────────────────────────────

/**
 * Returns a 0–100 integer match score for a given scholarship and user profile.
 * Fully deterministic — no network calls.
 */
export function computeMatchScore(scholarship: Scholarship, profile: UserProfile): number {
  // Scholarship fields
  const schGender   = scholarship.gender ?? 'all';
  const schLevel    = scholarship.eligibilityLevel ?? [];
  const schField    = scholarship.fieldOfStudy ?? [];
  const schLocation = scholarship.location ?? 'all';
  const schReligion = scholarship.religion ?? 'all';
  const schType     = scholarship.scholarshipType ?? '';
  const schEligText = (scholarship.eligibility as any)?.details ?? '';

  // Profile fields
  const profGender   = ((profile as any).gender ?? '').toLowerCase();
  const profReligion = ((profile as any).religion ?? '').toLowerCase();
  const profState    = ((profile as any).state ?? (profile as any).city ?? '').toLowerCase();
  const profCategory = ((profile as any).category ?? '').toLowerCase(); // OBC, SC, ST, EWS, General
  const profLevels   = bestEducationLevel(profile);
  const profFields   = profileFieldsOfStudy(profile);
  const profCgpa     = bestCgpa(profile);

  // ── Dimension scores ─────────────────────────────────────────────────────

  // 1. Gender (20%) — most scholarships are women-only on this platform
  const gScore = singleScore(schGender, profGender);

  // 2. Education level (20%)
  const eScore = levelMatch(schLevel, profLevels);

  // 3. Field of study (15%)
  const fScore = categoryScore(Array.isArray(schField) ? schField : [schField as string], profFields);

  // 4. Location (15%)
  const lScore: number = (() => {
    const sl = schLocation.toLowerCase();
    if (sl === 'all' || sl === 'india' || sl === 'pan-india' || sl === '') return 1.0;
    if (sl === 'abroad' || sl === 'international') return profState ? 0.2 : 0.5;
    if (!profState) return 0.5;
    return profState.includes(sl) || sl.includes(profState) ? 1.0 : 0.3;
  })();

  // 5. Religion (10%)
  const rScore = singleScore(schReligion, profReligion);

  // 6. Category / scholarship type (10%)
  const cScore: number = (() => {
    const st = schType.toLowerCase();
    if (!st || st === 'merit' || st === 'need-based' || st === 'general') return 1.0;
    // Category-specific scholarships
    if (st.includes('sc') || st.includes('scheduled caste')) return profCategory === 'sc' ? 1.0 : 0.1;
    if (st.includes('st') || st.includes('scheduled tribe'))  return profCategory === 'st' ? 1.0 : 0.1;
    if (st.includes('obc')) return profCategory === 'obc' ? 1.0 : 0.2;
    if (st.includes('ews') || st.includes('economically')) return profCategory === 'ews' ? 1.0 : 0.2;
    if (st.includes('minority')) return ['muslim','christian','sikh','buddhist','jain','parsi'].includes(profReligion) ? 1.0 : 0.2;
    if (st.includes('differently abled') || st.includes('pwd') || st.includes('disability')) {
      return (profile as any).hasDisability ? 1.0 : 0.1;
    }
    return 0.7; // unknown type — give benefit of doubt
  })();

  // 7. CGPA threshold (10%)
  const qScore: number = (() => {
    const minCgpa = extractMinCgpa(schEligText);
    if (minCgpa === null) return 0.8; // no CGPA requirement found
    if (profCgpa === null) return 0.4; // no CGPA in profile
    if (minCgpa > 10) {
      // Percentage-based threshold
      const profPct = profCgpa > 10 ? profCgpa : profCgpa * 10; // normalise if CGPA on 10-scale
      return profPct >= minCgpa ? 1.0 : profPct >= minCgpa - 5 ? 0.6 : 0.2;
    }
    // CGPA on 10-scale
    const profCgpa10 = profCgpa > 10 ? profCgpa / 10 : profCgpa;
    return profCgpa10 >= minCgpa ? 1.0 : profCgpa10 >= minCgpa - 0.5 ? 0.6 : 0.2;
  })();

  // ── Weighted sum ──────────────────────────────────────────────────────────
  const rawScore =
    gScore * 20 +
    eScore * 20 +
    fScore * 15 +
    lScore * 15 +
    rScore * 10 +
    cScore * 10 +
    qScore * 10;

  // Clamp and round to integer
  return Math.round(Math.min(100, Math.max(0, rawScore)));
}

/**
 * Convenience: compute match scores for all scholarships at once.
 * Returns a Map<scholarshipId, score>.
 */
export function computeAllMatchScores(
  scholarships: Scholarship[],
  profile: UserProfile | null,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!profile) return map;
  for (const s of scholarships) {
    map.set(s.id, computeMatchScore(s, profile));
  }
  return map;
}
