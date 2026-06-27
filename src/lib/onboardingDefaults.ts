import type { ResumeProfile } from '@/types/resumeProfile';

export function defaultProfile(): Omit<ResumeProfile, 'domain' | 'completedAt'> & { domain?: ResumeProfile['domain'] } {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    website: '',
    domain: undefined,
    targetRoles: [],
    experiences: [],
    education: [],
    projects: [],
    certifications: [],
    skills: [],
    summary: '',
    languages: [],
    awards: [],
    volunteer: [],
    publications: [],
    lastUpdated: Date.now(),
  };
}
