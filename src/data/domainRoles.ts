export const DOMAINS = [
  { id: 'computer-science', label: 'Computer Science & Tech', icon: '💻' },
  { id: 'finance-banking', label: 'Finance & Banking', icon: '📈' },
  { id: 'education', label: 'Education', icon: '🎓' },
  { id: 'medical', label: 'Medical & Healthcare', icon: '🏥' },
] as const;

export const DOMAIN_ROLES: Record<string, string[]> = {
  'computer-science': [
    'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'Mobile Developer', 'DevOps Engineer', 'Cloud Architect', 'Machine Learning Engineer',
    'Data Scientist', 'Data Analyst', 'Product Manager', 'QA Engineer',
    'Security Engineer', 'Embedded Systems Engineer', 'Site Reliability Engineer',
  ],
  'finance-banking': [
    'Financial Analyst', 'Investment Banker', 'Portfolio Manager', 'Risk Analyst',
    'Accountant', 'Financial Advisor', 'Compliance Officer', 'Equity Trader',
    'Credit Analyst', 'Auditor', 'Actuary', 'Quantitative Analyst',
    'Wealth Manager', 'Treasury Analyst', 'Loan Officer',
  ],
  'education': [
    'Teacher', 'Professor', 'Curriculum Designer', 'Instructional Designer',
    'School Counselor', 'Education Administrator', 'Academic Advisor',
    'Special Education Teacher', 'Librarian', 'Education Consultant',
    'E-Learning Developer', 'Research Assistant',
  ],
  'medical': [
    'Physician', 'Nurse Practitioner', 'Registered Nurse', 'Pharmacist',
    'Physical Therapist', 'Occupational Therapist', 'Radiologist',
    'Dentist', 'Psychologist', 'Medical Researcher', 'Healthcare Administrator',
    'Surgeon', 'Anesthesiologist', 'Medical Laboratory Technician', 'Paramedic',
  ],
};
