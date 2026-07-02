// Pure boundary logic for the JD Matcher's low-fit-score gate. Deliberately has zero
// imports so it can be unit-tested — JDMatcherPage.tsx itself can't be imported directly
// in tests: it pulls in firebaseWeb.ts (uses import.meta.env, which Jest's transform
// can't parse) and uses the "@/..." path alias, which isn't configured in Jest's resolver.

/** The single source of truth for the low-fit-score gate boundary. */
export function shouldPauseForLowFit(score: number): boolean {
  return score < 50;
}
