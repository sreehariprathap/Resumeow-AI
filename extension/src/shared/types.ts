export interface Experience {
  id: string;
  company: string;
  role: string;
  from: string;
  to: string;
  bullets: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  from: string;
  to: string;
  bullets: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  skills: string[];
}

export interface SkillGroup {
  category: string;
  skills: string[];
}

export interface Language {
  name: string;
  proficiency: 'Native' | 'Fluent' | 'Intermediate' | 'Basic';
}

export interface Award {
  title: string;
  issuer: string;
  year: string;
}

export interface VolunteerEntry {
  org: string;
  role: string;
  description: string;
}

export interface ResumeProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  website?: string;
  domain: 'computer-science' | 'finance-banking' | 'education' | 'medical';
  targetRoles: string[];
  experiences: Experience[];
  education: Education[];
  projects?: Project[];
  certifications: string[];
  skills: SkillGroup[];
  summary?: string;
  languages?: Language[];
  awards?: Award[];
  volunteer?: VolunteerEntry[];
  publications?: string[];
  completedAt?: number;
  lastUpdated: number;
  currentStep?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  plan: 'free' | 'pro' | 'admin';
  tokensAllocated: number;
  tokensUsed: number;
  tokensRemaining: number;
  isAdmin: boolean;
  createdAt: number;
  lastActiveAt: number;
}

export type JobSite =
  | 'linkedin'
  | 'indeed'
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workday'
  | 'glassdoor'
  | 'smartrecruiters'
  | 'icims'
  | 'taleo'
  | 'successfactors'
  | 'unknown';

export type WorkdayStep =
  | 'my-information'
  | 'my-experience'
  | 'application-questions'
  | 'self-identify'
  | 'voluntary-disclosures'
  | 'review'
  | 'unknown';

export interface ResumeProfileOption {
  id: string;
  label: string;
  profile: ResumeProfile;
}

export type FieldType =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'location'
  | 'linkedin'
  | 'website'
  | 'github'
  | 'workAuthorization'
  | 'veteranStatus'
  | 'disabilityStatus'
  | 'coverLetter'
  | 'whyThisCompany'
  | 'additionalInfo'
  | 'yearsOfExperience'
  | 'salaryExpectation'
  | 'unknown';

export interface ScanResult {
  site: JobSite;
  jobTitle: string;
  company: string;
  jobDescription: string;
  fieldCount: number;
  workdayStep?: WorkdayStep;
  isApplicationPage?: boolean;
  isJobListingPage?: boolean;
}

export interface FillResult {
  filled: number;
  skipped: string[];
}

export interface AIAnswers {
  coverLetter: string;
  whyThisCompany: string;
  additionalInfo: string;
  yearsOfExperience: string;
}

// Message types for chrome.runtime.sendMessage
export type ExtMessage =
  | { type: 'GET_AUTH_STATE' }
  | { type: 'GET_PROFILE' }
  | { type: 'GET_RESUME_PROFILE' }
  | { type: 'GET_RESUME_PROFILES' }
  | { type: 'GENERATE_AI_ANSWERS'; jobDescription: string; resumeProfile: ResumeProfile }
  | { type: 'SCAN_PAGE' }
  | { type: 'SCAN_PAGE_ASYNC' }
  | { type: 'FILL_FORMS'; data: { profile: ResumeProfile; aiAnswers?: AIAnswers } }
  | { type: 'FILL_FORMS_WORKDAY'; data: { profile: ResumeProfile; aiAnswers?: AIAnswers } }
  | { type: 'HIGHLIGHT_FIELDS' };
