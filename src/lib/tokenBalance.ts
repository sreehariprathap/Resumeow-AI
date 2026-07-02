// Pure token-balance evaluation logic — deliberately has NO import of firebaseWeb.ts or
// authContext.tsx as a value (only as a type), so it can be unit-tested without Jest
// choking on their `import.meta.env` usage (Vite-only syntax). tokenContext.tsx imports
// and re-exports everything here for its own use.
import type { UserProfile } from './firebaseWeb';

/** Thrown when the user has *some* tokens left, but not enough for this specific call.
 *  Distinct from the plain `Error('INSUFFICIENT_TOKENS')` thrown for a true zero balance —
 *  callers branch on error type to decide "global banner" vs. "block just this action". */
export class InsufficientTokensForCallError extends Error {
  needed: number;
  remaining: number;
  constructor(needed: number, remaining: number) {
    super('INSUFFICIENT_TOKENS_FOR_CALL');
    this.name = 'InsufficientTokensForCallError';
    this.needed = needed;
    this.remaining = remaining;
  }
}

export type BalanceOutcome =
  | { ok: true }
  | { ok: false; reason: 'zero' }
  | { ok: false; reason: 'insufficient'; needed: number; remaining: number };

/** Pure decision logic, extracted so it's testable without mocking Firebase or React. */
export function evaluateTokenBalance(profile: UserProfile | null, estimatedTokens: number): BalanceOutcome {
  if (!profile || profile.isAdmin) return { ok: true };
  if (profile.tokensRemaining <= 0) return { ok: false, reason: 'zero' };
  if (profile.tokensRemaining < estimatedTokens) {
    return { ok: false, reason: 'insufficient', needed: estimatedTokens, remaining: profile.tokensRemaining };
  }
  return { ok: true };
}
