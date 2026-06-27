import { describe, it, expect } from '@jest/globals';
import { computeMissingDefaults, RESUME_PROFILE_DEFAULTS } from '../profileSeeding';

describe('computeMissingDefaults', () => {
  const defaults = { a: 1, b: 2, c: [] as number[] };

  it('returns all defaults when existing is null/undefined', () => {
    expect(computeMissingDefaults(null, defaults)).toEqual(defaults);
    expect(computeMissingDefaults(undefined, defaults)).toEqual(defaults);
  });

  it('fills only keys that are missing', () => {
    expect(computeMissingDefaults({ a: 99 }, defaults)).toEqual({ b: 2, c: [] });
  });

  it('treats null and undefined values as missing', () => {
    const existing = { a: null, b: undefined } as Record<string, unknown>;
    expect(computeMissingDefaults(existing, defaults)).toEqual({ a: 1, b: 2, c: [] });
  });

  it('never overwrites existing truthy or falsy-but-set values', () => {
    // 0 and empty string are "set" — must be preserved.
    const existing = { a: 0, b: '', c: [5] } as Record<string, unknown>;
    expect(computeMissingDefaults(existing, defaults)).toEqual({});
  });

  it('returns an empty patch when nothing is missing (idempotent on re-run)', () => {
    const full = { a: 1, b: 2, c: [] };
    expect(computeMissingDefaults(full, defaults)).toEqual({});
  });

  it('backfills the new ResumeProfile collection fields onto an old document', () => {
    const oldProfile = {
      firstName: 'Jane',
      experiences: [{ id: '1' }],
      // missing: targetRoles, education, projects, certifications, skills,
      //          languages, awards, volunteer, publications
    } as Record<string, unknown>;

    const patch = computeMissingDefaults(oldProfile, RESUME_PROFILE_DEFAULTS);

    expect(patch).toEqual({
      targetRoles: [],
      education: [],
      projects: [],
      certifications: [],
      skills: [],
      languages: [],
      awards: [],
      volunteer: [],
      publications: [],
    });
    // existing data is not part of the patch
    expect(patch).not.toHaveProperty('experiences');
    expect(patch).not.toHaveProperty('firstName');
  });
});
