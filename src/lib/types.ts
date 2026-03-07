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
