export type Scholarship = {
  id: string;
  title: string;
  provider: string;
  amount: number;
  deadline: Date;
  description: string;
  eligibility: {
    title: string;
    details: string;
  };
  fieldOfStudy: string[];
  location: string;
  eligibilityLevel: string[];
  scholarshipType: string;
  isFeatured?: boolean;
  lastUpdated: Date;
  status: 'Live' | 'Upcoming' | 'Always Open';
  gender: string;
  religion: string;
  officialLink?: string;
  providerLogo?: string;
};

export type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'accepted' | 'rejected';

export type Application = {
  id: string;
  studentId: string;
  scholarshipId: string;
  status: ApplicationStatus;
  matchScore: number;
  appliedAt: any;
  resumeSnapshot: {
    fullName: string;
    email: string;
    phone: string;
    qualification: string;
    college: string | null;
  };
};
