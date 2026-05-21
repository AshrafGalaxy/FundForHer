
// src/server/db/user-data.ts

// ── Privacy Types ─────────────────────────────────────────────────────────────

// Fields the user can individually toggle public/private
export type PublicFieldKey =
  | 'education'        // College, degree, field of study
  | 'location'         // State + city only (never full address)
  | 'category'         // General/OBC/SC/ST etc.
  | 'languages'        // Languages known
  | 'skills'           // Technical + soft + programming skills
  | 'certifications'   // Certification list
  | 'achievements'     // Awards & extracurriculars
  | 'internships'      // Work experience
  | 'fellowships'      // Fellowships
  | 'scholarshipsWon'  // Previous scholarships awarded
  | 'publications';    // Research & publications

// Always private (never shown publicly — enforced server-side too):
// phone, whatsapp, email, address, aadhar, annualFamilyIncome,
// rationCardType, testScores, documents, dob (age shown instead)

export const DEFAULT_PUBLIC_FIELDS: PublicFieldKey[] = [
  'education', 'location', 'skills', 'certifications', 'achievements',
];

import { doc, setDoc, getDoc, serverTimestamp, updateDoc, deleteDoc, Timestamp, type Firestore } from 'firebase/firestore';

// ── Sub-types ─────────────────────────────────────────────────────────────────

export interface EducationEntry {
  id: string; // uuid – client generated
  degreeLevel: 'Class 10' | 'Class 12' | 'Diploma' | 'UG' | 'PG' | 'PhD' | 'Integrated' | 'Dual Degree' | 'Certificate' | 'Other';
  degreeName: string;
  specialisation: string;
  institution: string;
  university: string;
  locationCity: string;
  startYear: string;
  endYear: string;
  status: 'Completed' | 'Ongoing' | 'Dropped';
  scoreType: 'CGPA' | 'Percentage' | 'GPA' | 'Grade';
  score: string;
  scoreOutOf: string;
  division: string;
  backlogs: number;
  mediumOfInstruction: 'English' | 'Hindi' | 'Regional' | 'Other';
  scholarshipDuringDegree: boolean;
  scholarshipName: string;
}

export interface TestScore {
  id: string;
  examName: string;
  score: string;
  rank: string;
  percentile: string;
  year: string;
  additionalInfo: string; // e.g. stream for GATE, AWA for GRE
}

export interface Internship {
  id: string;
  company: string;
  role: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  type: 'Remote' | 'Onsite' | 'Hybrid';
  stipend: string;
  description: string;
  certificateUrl: string;
}

export interface Fellowship {
  id: string;
  name: string;
  organisation: string;
  year: string;
  duration: string;
  amount: string;
  description: string;
}

export interface ScholarshipWon {
  id: string;
  name: string;
  organisation: string;
  yearAwarded: string;
  amount: string;
  level: 'National' | 'State' | 'University' | 'Private' | 'International' | 'Other';
}

export interface Certification {
  id: string;
  name: string;
  issuingOrg: string;
  issueDate: string;
  expiryDate: string;
  credentialId: string;
  certificateUrl: string;
}

export interface Achievement {
  id: string;
  activityName: string;
  category: 'Sports' | 'Arts' | 'Social Work' | 'Tech' | 'Academic' | 'Other';
  level: 'School' | 'District' | 'State' | 'National' | 'International';
  year: string;
  award: string;
}

export interface Publication {
  id: string;
  title: string;
  type: 'Paper' | 'Patent' | 'Book' | 'Thesis' | 'Other';
  journal: string;
  year: string;
  doi: string;
}

export interface DocumentVaultEntry {
  docType: string;        // e.g. 'aadhar_front', 'income_cert'
  label: string;          // human-readable label
  storagePath: string;    // Firebase Storage path (not the download URL)
  downloadURL?: string;   // Permanent HTTPS URL — cached to avoid redundant Storage reads
  fileName: string;
  fileSizeBytes: number;
  uploadedAt: string;     // ISO date string
}


// ── Main UserProfile ──────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;

  // ── Identity (sidebar) ─────────────────────────────────────────
  fullName: string;
  email: string;
  photoURL?: string | null;
  username?: string | null;       // unique @handle e.g. "priya_sharma"
  tagline?: string | null;        // 80-char headline
  bio?: string | null;            // 300-char about me
  avatarFrame?: 'default' | 'gold' | 'verified' | 'community'; // cosmetic ring

  // ── Privacy Settings ──────────────────────────────────────────
  isProfilePublic?: boolean;      // false = private (only self can see full profile)
  publicFields?: PublicFieldKey[]; // which optional sections are visible publicly

  // ── Personal Details ───────────────────────────────────────────
  phone?: string | null;
  whatsapp?: string | null;
  dob?: Date | Timestamp | null;
  age?: number | null;
  gender?: 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say' | null;
  religion?: string | null;
  category?: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS' | 'PwD' | null;
  nationality?: string | null;
  stateOfDomicile?: string | null;
  city?: string | null;
  address?: string | null;
  linkedinUrl?: string | null;
  languages?: string[] | null;   // e.g. ['English', 'Hindi']

  // Financial
  annualFamilyIncome?: number | null; // in ₹
  rationCardType?: 'APL' | 'BPL' | 'AAY' | 'None' | null;
  fatherOccupation?: string | null;
  motherOccupation?: string | null;

  // Identity docs (text fields — Aadhar kept for backward compat)
  aadhar?: string | null;

  // ── Education ──────────────────────────────────────────────────
  // Kept for backward-compat with existing queries / AI matching
  qualification?: string | null;
  college?: string | null;
  fieldOfStudy?: string | null;
  cgpa?: string | null;

  // Rich education entries
  educationEntries?: EducationEntry[] | null;
  testScores?: TestScore[] | null;           // PRIVATE – not shown publicly

  // ── Experience & Achievements ──────────────────────────────────
  internships?: Internship[] | null;
  fellowships?: Fellowship[] | null;
  scholarshipsWon?: ScholarshipWon[] | null;
  certifications?: Certification[] | null;
  achievements?: Achievement[] | null;
  publications?: Publication[] | null;
  technicalSkills?: string[] | null;
  softSkills?: string[] | null;
  programmingLanguages?: string[] | null;

  // ── Document Vault ─────────────────────────────────────────────
  documents?: DocumentVaultEntry[] | null;

  // ── Mentorship opt-in ──────────────────────────────────────────
  isMentor?: boolean;
  karmaPoints?: number;

  // ── Meta ────────────────────────────────────────────────────────
  createdAt: any;
  updatedAt: any;
}

// ── Provider Profile ──────────────────────────────────────────────────────────

export interface ProviderProfile {
  uid: string;
  companyName: string;
  email: string;
  companyPhone: string;
  registrationNumber: string;
  gstNumber: string;
  kycStatus: 'pending' | 'verified' | 'rejected' | 'require_more_info';
  kycDocumentUrl: string | null;
  // ── Branding (new) ───────────────────────────────────────────────
  logoUrl?: string | null;        // Firebase Storage public URL — shown on ScholarshipCards
  websiteUrl?: string | null;     // Organisation website
  description?: string | null;    // Mission / about blurb
  createdAt: any;
  updatedAt: any;
}

// ── CRUD Helpers ──────────────────────────────────────────────────────────────

export const createInitialUserProfile = async (
  db: Firestore,
  uid: string,
  data: { fullName: string; email: string; phone: string; dob: Date; qualification: string },
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const today = new Date();
  let calculatedAge = today.getFullYear() - data.dob.getFullYear();
  const m = today.getMonth() - data.dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < data.dob.getDate())) calculatedAge--;

  await setDoc(userRef, {
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    age: calculatedAge,
    dob: data.dob,
    qualification: data.qualification,
    address: null,
    college: null,
    fieldOfStudy: null,
    aadhar: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const createInitialProviderProfile = async (
  db: Firestore,
  uid: string,
  data: Omit<ProviderProfile, 'uid' | 'createdAt' | 'updatedAt'>,
): Promise<void> => {
  const providerRef = doc(db, 'providers', uid);
  await setDoc(providerRef, {
    ...data,
    uid,
    kycStatus: data.kycStatus || 'pending',
    kycDocumentUrl: data.kycDocumentUrl || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getUserProfile = async (db: Firestore, uid: string): Promise<UserProfile | null> => {
  const docSnap = await getDoc(doc(db, 'users', uid));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  if (data.dob && typeof data.dob.toDate === 'function') data.dob = data.dob.toDate();
  return { ...data, uid } as UserProfile;
};

export const getProviderProfile = async (db: Firestore, uid: string): Promise<ProviderProfile | null> => {
  const docSnap = await getDoc(doc(db, 'providers', uid));
  return docSnap.exists() ? ({ ...docSnap.data(), uid } as ProviderProfile) : null;
};

export const updateUserProfile = async (
  db: Firestore,
  uid: string,
  data: Partial<Omit<UserProfile, 'uid'>>,
) => {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
};

export const deleteUserProfile = async (db: Firestore, uid: string) => {
  await deleteDoc(doc(db, 'users', uid));
};

export const updateProviderProfile = async (
  db: Firestore,
  uid: string,
  data: Partial<Omit<ProviderProfile, 'uid'>>,
) => {
  await updateDoc(doc(db, 'providers', uid), { ...data, updatedAt: serverTimestamp() });
};
