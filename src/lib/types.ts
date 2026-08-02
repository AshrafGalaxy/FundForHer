export type Scholarship = {
  id: string;
  title: string;
  provider: string;
  providerId?: string;
  amount: number;
  deadline: Date;
  description: string;
  eligibilityCriteria?: string;
  eligibility?: {
    title: string;
    details: string;
  };
  fieldOfStudy: string[];
  location: string;
  eligibilityLevel: string[];
  scholarshipType: string;
  isFeatured?: boolean;
  lastUpdated: Date;
  status: 'Live' | 'Upcoming' | 'Always Open' | 'Expired' | 'active';
  gender: string;
  religion: string;
  category?: string;
  minCgpa?: number;
  officialLink?: string;
  providerLogo?: string;
};

export type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'accepted' | 'rejected';

export type StatusHistoryEntry = {
  status: ApplicationStatus;
  timestamp: any;                // Firestore Timestamp
  comment?: string;              // Optional provider feedback message
  updatedBy: 'system' | 'provider' | 'student';
};

export type Application = {
  id: string;
  studentId: string;
  scholarshipId: string;
  scholarshipTitle?: string;
  status: ApplicationStatus;
  matchScore: number;
  appliedAt: any;
  submittedAt?: any;
  // ── Status history (timeline) ───────────────────────────────────────────────
  statusHistory?: StatusHistoryEntry[];
  providerComment?: string | null;    // Latest comment from provider (denormalised)
  lastStatusUpdate?: any;             // Timestamp of most recent status change
  // ── Flat profile fields (new apply form) ──────────────────────────────────
  fullName: string;
  email: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  category?: string;
  religion?: string;
  hasDisability?: boolean;
  city?: string;
  state?: string;
  currentEducationLevel?: string;
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  currentScore?: string;
  graduationYear?: string;
  annualFamilyIncome?: string;
  rationCard?: string;
  skills?: string;
  achievements?: string;
  personalStatement?: string;
  vaultDocIds?: string[];
  // ── Legacy snapshot (backward compat) ─────────────────────────────────────
  resumeSnapshot?: {
    fullName: string;
    email: string;
    phone?: string;
    qualification?: string;
    college?: string | null;
  };
};

