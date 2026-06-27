import type { ResumeProfile } from '../types/resumeProfile';

export interface ProfileCompletionStatus {
  isComplete: boolean;
  completionPercent: number;
  missingFields: string[];
  hasMinimumData: boolean;
}

export function checkProfileCompletion(profile: ResumeProfile | null | undefined): ProfileCompletionStatus {
  if (!profile) {
    return {
      isComplete: false,
      completionPercent: 0,
      missingFields: ['Complete onboarding to get started'],
      hasMinimumData: false,
    };
  }

  const checks: { field: string; label: string; weight: number }[] = [
    { field: 'firstName', label: 'First name', weight: 5 },
    { field: 'lastName', label: 'Last name', weight: 5 },
    { field: 'email', label: 'Email', weight: 5 },
    { field: 'phone', label: 'Phone number', weight: 5 },
    { field: 'location', label: 'Location', weight: 5 },
    { field: 'domain', label: 'Career domain', weight: 10 },
    { field: 'targetRoles', label: 'Target roles', weight: 10 },
    { field: 'experiences', label: 'Work experience', weight: 25 },
    { field: 'education', label: 'Education', weight: 20 },
    { field: 'skills', label: 'Skills', weight: 10 },
  ];

  const missingFields: string[] = [];
  let earnedWeight = 0;
  let totalWeight = 0;

  for (const check of checks) {
    totalWeight += check.weight;
    const value = (profile as unknown as Record<string, unknown>)[check.field];
    const filled = Array.isArray(value) ? value.length > 0 : Boolean(value);
    if (filled) {
      earnedWeight += check.weight;
    } else {
      missingFields.push(check.label);
    }
  }

  const completionPercent = Math.round((earnedWeight / totalWeight) * 100);

  const hasPersonalInfo = Boolean(profile.firstName && profile.email);
  const hasExperienceOrEducation =
    (profile.experiences?.length ?? 0) > 0 || (profile.education?.length ?? 0) > 0;
  const hasMinimumData = hasPersonalInfo && hasExperienceOrEducation;

  return {
    isComplete: completionPercent >= 70,
    completionPercent,
    missingFields,
    hasMinimumData,
  };
}
