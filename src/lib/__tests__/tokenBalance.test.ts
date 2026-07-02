import { evaluateTokenBalance } from '../tokenBalance';
import type { UserProfile } from '../firebaseWeb';

const baseProfile: UserProfile = {
  uid: 'u1', email: 'a@b.com', displayName: 'A', plan: 'free',
  tokensAllocated: 100, tokensUsed: 0, tokensRemaining: 100,
  isAdmin: false, createdAt: 0, lastActiveAt: 0,
};

describe('evaluateTokenBalance', () => {
  it('passes when remaining covers the estimate', () => {
    const profile = { ...baseProfile, tokensRemaining: 10 };
    expect(evaluateTokenBalance(profile, 5)).toEqual({ ok: true });
  });

  it('returns zero reason when remaining is exactly 0', () => {
    const profile = { ...baseProfile, tokensRemaining: 0 };
    expect(evaluateTokenBalance(profile, 5)).toEqual({ ok: false, reason: 'zero' });
  });

  it('returns zero reason when remaining is negative', () => {
    const profile = { ...baseProfile, tokensRemaining: -3 };
    expect(evaluateTokenBalance(profile, 5)).toEqual({ ok: false, reason: 'zero' });
  });

  it('returns insufficient reason when remaining is positive but under the estimate', () => {
    const profile = { ...baseProfile, tokensRemaining: 3 };
    expect(evaluateTokenBalance(profile, 8)).toEqual({ ok: false, reason: 'insufficient', needed: 8, remaining: 3 });
  });

  it('passes for admin profiles regardless of remaining', () => {
    const profile = { ...baseProfile, isAdmin: true, tokensRemaining: 0 };
    expect(evaluateTokenBalance(profile, 999)).toEqual({ ok: true });
  });

  it('passes when profile is null (fails open — matches existing offline behavior)', () => {
    expect(evaluateTokenBalance(null, 5)).toEqual({ ok: true });
  });
});
