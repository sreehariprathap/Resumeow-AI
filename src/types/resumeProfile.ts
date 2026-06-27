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
