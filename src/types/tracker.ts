export type ApplicationStatus = 'tracked' | 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn';

export interface TrackedApplication {
  id: string;
  createdAt: string; // ISO
  company: string;
  role: string;
  location: string;
  promptType: 'resume' | 'coverLetter';
  skills: string[];      // top skills extracted from JD
  atsScore?: number;
  jobFitScore?: number;
  status: ApplicationStatus;
}
