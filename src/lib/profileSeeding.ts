import type { ResumeProfile } from '@/types/resumeProfile';

/**
 * Compute the patch of fields that are missing from `existing` but present in
 * `defaults`. Only keys whose value is `undefined` or `null` on `existing` are
 * filled. Existing values are never overwritten, so this is safe to run on
 * every login (idempotent).
 *
 * Pure function — no Firestore I/O — so it can be unit tested in isolation.
 */
export function computeMissingDefaults<T extends object>(
  existing: Partial<T> | null | undefined,
  defaults: Partial<T>,
): Partial<T> {
  if (!existing) return { ...defaults };

  const patch: Partial<T> = {};
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const current = existing[key];
    if (current === undefined || current === null) {
      patch[key] = defaults[key];
    }
  }
  return patch;
}

/**
 * Default values for the newer ResumeProfile fields. These are the "new
 * implemented fields" that older onboarding documents may be missing. All
 * defaults are empty collections so backfilling them is non-destructive and
 * keeps downstream `.map()` / `.length` reads from blowing up.
 *
 * Scalar/union fields (domain, firstName, summary, …) are intentionally left
 * out — there is no safe default for them, and onboarding already collects them.
 */
export const RESUME_PROFILE_DEFAULTS: Partial<ResumeProfile> = {
  targetRoles: [],
  experiences: [],
  education: [],
  projects: [],
  certifications: [],
  skills: [],
  languages: [],
  awards: [],
  volunteer: [],
  publications: [],
};
