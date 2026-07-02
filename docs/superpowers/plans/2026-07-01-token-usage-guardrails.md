# Token Usage Guardrails & Transparency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the app's binary "any tokens left?" gate into a per-call cost estimate, add a persistent "AI functions disabled" banner for zero balance, extend the existing Profile token display with a cost-explainer dialog, and mirror that dialog trigger in the header.

**Architecture:** Pure estimation logic lives in `llm.config.ts` (multiplier table + estimator) and `tokenContext.tsx` (balance-evaluation function), so both are unit-testable without mocking React or Firebase. `useAIService.ts`'s six existing call wrappers each compute their own estimate from their own prompt and pass it through the existing `checkTokens()` choke point — no new call sites, no coverage gaps. A second, redundant zero-balance check already exists one layer down in `aiProviderContext.tsx` (3 call sites) and in `JDMatcherPage.tsx`'s PDF-compile step; both get mechanically updated to the new signature without changing their existing behavior.

**Tech Stack:** React, TypeScript, Firebase/Firestore, Jest (existing test runner — plain `describe`/`it`/`expect`, no React Testing Library component rendering in this codebase's existing test suite; new tests follow that pure-function-testing convention).

## Global Constraints

- **Deviation from spec §4, noted during planning:** the spec describes "a new card" for the Profile Usage section, written before this plan re-inspected `ProfilePage.tsx`. That page already has an "Account" card (lines 274-321) showing plan badge, tokens remaining/allocated/used, and a matching progress bar with the same 40%/15% color thresholds the spec asked for. Task 5 and Task 7 extend that existing card (dedupe its color logic, add the info-icon trigger) instead of building a duplicate one — building a second Usage card next to an equivalent existing one would be pure redundancy.
- Billing stays post-hoc (`750 output chars = 1 token`, unchanged) — pre-flight estimates only gate whether a call is allowed to start, per spec §2.1.
- Admin accounts are never blocked and never see the banner (existing behavior, must not regress).
- `assertSufficientBalance` fails open on offline/permission errors (existing behavior at `tokenContext.tsx:67-70`, must not regress).
- Contact link is exactly `mailto:sreehariprathap1996@gmail.com` (matches `WebFooter.tsx`'s existing pattern — do not invent a different address).
- Reuse `RequestTokensDialog` (existing component) for every "request tokens" CTA — do not build a second request form.

---

### Task 1: Per-task token-cost multipliers + estimator in `llm.config.ts`

**Files:**
- Modify: `src/config/llm.config.ts:110` (insert after the `LLMTaskKey` union, before the `// ─── Config ───` comment)
- Test: `src/config/__tests__/llm.config.test.ts` (new)

**Interfaces:**
- Produces: `TASK_TOKEN_MULTIPLIERS: Record<LLMTaskKey, number>`, `DEFAULT_TOKEN_MULTIPLIER: number`, `estimateTokensForTask(taskKey: LLMTaskKey | undefined, promptChars: number): number` — all exported from `src/config/llm.config.ts`. Task 3 imports `estimateTokensForTask`.

- [ ] **Step 1: Write the failing test**

Create `src/config/__tests__/llm.config.test.ts`:

```ts
import { estimateTokensForTask, TASK_TOKEN_MULTIPLIERS, DEFAULT_TOKEN_MULTIPLIER } from '../llm.config';

describe('estimateTokensForTask', () => {
  it('applies the resumeLatex multiplier to prompt length', () => {
    const promptChars = 3000;
    const expected = Math.max(1, Math.ceil((promptChars * TASK_TOKEN_MULTIPLIERS.resumeLatex) / 750));
    expect(estimateTokensForTask('resumeLatex', promptChars)).toBe(expected);
  });

  it('applies a smaller multiplier for extractJobDetails than resumeLatex', () => {
    const promptChars = 3000;
    expect(estimateTokensForTask('extractJobDetails', promptChars)).toBeLessThan(
      estimateTokensForTask('resumeLatex', promptChars)
    );
  });

  it('falls back to DEFAULT_TOKEN_MULTIPLIER when taskKey is undefined', () => {
    const promptChars = 3000;
    const expected = Math.max(1, Math.ceil((promptChars * DEFAULT_TOKEN_MULTIPLIER) / 750));
    expect(estimateTokensForTask(undefined, promptChars)).toBe(expected);
  });

  it('never returns less than 1', () => {
    expect(estimateTokensForTask('jobFit', 1)).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/config/__tests__/llm.config.test.ts`
Expected: FAIL — `estimateTokensForTask` / `TASK_TOKEN_MULTIPLIERS` / `DEFAULT_TOKEN_MULTIPLIER` are not exported from `../llm.config`.

- [ ] **Step 3: Add the multiplier table and estimator**

In `src/config/llm.config.ts`, insert immediately after line 110 (`| 'bioSummary';`) and before the `// ─── Config ───` comment:

```ts

/**
 * Pre-flight cost estimate multiplier, applied to a call's prompt length:
 *   estimatedTokens = ceil((promptChars * multiplier) / 750)
 * Calibrated against each task's typical OUTPUT size, independent of how
 * large the prompt itself is (e.g. resumeLatex takes a large profile-JSON
 * prompt but produces a fairly fixed-size LaTeX document; extractJobDetails
 * takes a large JD prompt but produces a tiny JSON blob).
 * These are estimates for pre-flight gating only — they do not change how
 * a call is actually billed (still post-hoc, from the real response length,
 * via useAIService.ts's `bill()`).
 */
export const TASK_TOKEN_MULTIPLIERS: Record<LLMTaskKey, number> = {
  resumeLatex: 1.8,        // large, fairly fixed-size LaTeX output
  coverLetter: 0.9,        // medium prose output
  atsAnalysis: 0.6,        // structured JSON, moderate
  combinedATS: 0.8,        // structured JSON, larger (score + suggestions)
  extractJobDetails: 0.15, // tiny JSON output regardless of JD size
  jobFit: 0.2,             // small JSON verdict
  resumeParse: 1.2,        // full structured resume JSON output
  lazyPipelineJD: 0.5,
  lazyPipelineLatex: 1.8,
  resumeScore: 0.5,
  jdMatcher: 0.9,          // full match report (keywords, bullets, snippet)
  bioSummary: 0.3,
};

/** Fallback multiplier for the one untyped call path (the generic makeAICall). */
export const DEFAULT_TOKEN_MULTIPLIER = 0.9;

/** Estimated token cost for a call, from its prompt length and task key. Gating only — see comment above. */
export function estimateTokensForTask(taskKey: LLMTaskKey | undefined, promptChars: number): number {
  const multiplier = taskKey ? TASK_TOKEN_MULTIPLIERS[taskKey] : DEFAULT_TOKEN_MULTIPLIER;
  return Math.max(1, Math.ceil((promptChars * multiplier) / 750));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/config/__tests__/llm.config.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Type-check and commit**

```bash
npx tsc -b
git add src/config/llm.config.ts src/config/__tests__/llm.config.test.ts
git commit -m "feat: add per-task token-cost multipliers and pre-flight estimator"
```

---

### Task 2: Per-call balance evaluation in `tokenContext.tsx`

**Files:**
- Modify: `src/lib/tokenContext.tsx` (full file shown below for exact before/after)
- Test: `src/lib/__tests__/tokenContext.test.ts` (new)

**Interfaces:**
- Consumes: nothing new (uses existing `UserProfile` type from `./firebaseWeb`).
- Produces: `export function evaluateTokenBalance(profile: UserProfile | null, estimatedTokens: number): BalanceOutcome` where `BalanceOutcome = { ok: true } | { ok: false; reason: 'zero' } | { ok: false; reason: 'insufficient'; needed: number; remaining: number }`. Also `export class InsufficientTokensForCallError extends Error` with `needed: number` and `remaining: number` fields. `TokenContextType.assertSufficientBalance` becomes `(estimatedTokens: number) => Promise<void>`. Task 3 calls `assertSufficientBalance(estimate)` and catches `InsufficientTokensForCallError`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/tokenContext.test.ts`:

```ts
import { evaluateTokenBalance } from '../tokenContext';
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/tokenContext.test.ts`
Expected: FAIL — `evaluateTokenBalance` is not exported from `../tokenContext`.

- [ ] **Step 3: Implement `evaluateTokenBalance`, `InsufficientTokensForCallError`, and the new `assertSufficientBalance` signature**

Replace the full contents of `src/lib/tokenContext.tsx` with:

```tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './authContext';
import { getUserProfile, deductTokens as fbDeductTokens, type UserProfile } from './firebaseWeb';
import { log } from '@/lib/logger';

interface TokenContextType {
  profile: UserProfile | null;
  tokensRemaining: number;
  tokensUsed: number;
  tokensAllocated: number;
  isAdmin: boolean;
  plan: 'free' | 'pro' | 'admin';
  isLoading: boolean;
  deductTokens: (chars: number) => Promise<boolean>;
  refetch: () => Promise<void>;
  assertSufficientBalance: (estimatedTokens: number) => Promise<void>;
}

const TokenContext = createContext<TokenContextType | null>(null);

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

export function TokenProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!currentUser) { setProfile(null); setIsLoading(false); return; }
    try {
      const p = await getUserProfile(currentUser.uid);
      setProfile(p);
    } catch (e) {
      log.error('Token fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { void refetch(); }, [refetch]);

  const deductTokens = useCallback(async (chars: number): Promise<boolean> => {
    if (!currentUser) return false;
    // Admins never pay — check local profile first since it's fast
    if (profile?.isAdmin) return true;
    const amount = Math.max(1, Math.ceil(chars / 750));
    // Firestore is authoritative — skip stale local pre-check, let the DB decide
    const ok = await fbDeductTokens(currentUser.uid, amount);
    if (ok) {
      // Optimistic local update so UI reflects immediately without a refetch
      setProfile(prev => prev ? {
        ...prev,
        tokensUsed: prev.tokensUsed + amount,
        tokensRemaining: Math.max(0, prev.tokensRemaining - amount),
      } : prev);
    } else {
      // Deduction failed (insufficient balance or doc missing) — sync local state
      void refetch();
    }
    return ok;
  }, [currentUser, profile, refetch]);

  // Fetches a fresh balance from Firestore before each AI call to avoid stale local state.
  // estimatedTokens: the pre-flight cost estimate for THIS specific call (see llm.config.ts's
  // estimateTokensForTask). A true zero balance always throws the plain INSUFFICIENT_TOKENS
  // error; a positive-but-insufficient balance throws InsufficientTokensForCallError instead,
  // so callers can distinguish "you're fully out" from "you're a bit short for this one thing".
  const assertSufficientBalance = useCallback(async (estimatedTokens: number): Promise<void> => {
    if (!currentUser) return;
    let fresh: UserProfile | null = null;
    try {
      fresh = await getUserProfile(currentUser.uid);
    } catch {
      // Offline or Firestore rules blocked read — fail open, don't block the call
      log.warn('[tokens] Balance check skipped (offline or permission error)');
      return;
    }
    const outcome = evaluateTokenBalance(fresh, estimatedTokens);
    if (outcome.ok) return;
    if (outcome.reason === 'zero') throw new Error('INSUFFICIENT_TOKENS');
    throw new InsufficientTokensForCallError(outcome.needed, outcome.remaining);
  }, [currentUser]);

  return (
    <TokenContext.Provider value={{
      profile,
      tokensRemaining: profile?.tokensRemaining ?? 0,
      tokensUsed: profile?.tokensUsed ?? 0,
      tokensAllocated: profile?.tokensAllocated ?? 0,
      isAdmin: profile?.isAdmin ?? false,
      plan: profile?.plan ?? 'free',
      isLoading,
      deductTokens,
      refetch,
      assertSufficientBalance,
    }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useTokens() {
  const ctx = useContext(TokenContext);
  if (!ctx) throw new Error('useTokens must be used within TokenProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/tokenContext.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Type-check (this will show downstream call sites still using the old zero-arg signature — expected, fixed in Tasks 3 and 4)**

```bash
npx tsc -b
```
Expected: errors at `src/hooks/useAIService.ts:72`, `src/lib/aiProviderContext.tsx:383,495,515`, and `src/pages/JDMatcherPage.tsx:247` — all calling `assertSufficientBalance()` with no argument. This is expected at this point in the plan; do not fix them here.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tokenContext.tsx src/lib/__tests__/tokenContext.test.ts
git commit -m "feat: distinguish zero-balance from per-call-insufficient in token balance check"
```

---

### Task 3: Wire per-call estimates through `useAIService.ts`

**Files:**
- Modify: `src/hooks/useAIService.ts:65-243` (the `checkTokens` helper and its 6 call sites)

**Interfaces:**
- Consumes: `estimateTokensForTask` from `@/config/llm.config` (Task 1), `InsufficientTokensForCallError` from `@/lib/tokenContext` (Task 2).
- Produces: `checkTokens` now requires `(estimatedTokens: number)`. No change to the hook's public return shape — `useAIService(opts)` still returns the same named functions.

- [ ] **Step 1: Update `checkTokens` to take and forward an estimate, and handle the new error type**

In `src/hooks/useAIService.ts`, add the import and update `checkTokens`:

```ts
import { estimateTokensForTask } from '@/config/llm.config';
import { InsufficientTokensForCallError } from '@/lib/tokenContext';
```

Replace the existing `checkTokens` (lines 69-85):

```ts
  const checkTokens = useCallback(async (estimatedTokens: number) => {
    if (opts?.skipTokenCheck) return;
    try {
      await assertSufficientBalance(estimatedTokens);
    } catch (err) {
      if (err instanceof InsufficientTokensForCallError) {
        toast.error(`This needs ~${err.needed} token${err.needed !== 1 ? 's' : ''}, you have ${err.remaining} left.`, {
          action: opts?.onInsufficientTokens
            ? { label: 'Request Tokens', onClick: opts.onInsufficientTokens }
            : undefined,
        });
        throw err;
      }
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'INSUFFICIENT_TOKENS') {
        toast.error('You have no tokens left. Request more to continue using AI features.', {
          action: opts?.onInsufficientTokens
            ? { label: 'Request Tokens', onClick: opts.onInsufficientTokens }
            : undefined,
        });
        throw err;
      }
      throw err;
    }
  }, [assertSufficientBalance, opts]);
```

- [ ] **Step 2: Pass an estimate from each of the 6 call sites**

Each wrapper already has its own `prompt` (or builds one) before calling `checkTokens()`. Update each call:

`makeAICallWithRetry` (generic, no task key — line 120-121):
```ts
  const makeAICallWithRetry = useCallback(async (prompt: string): Promise<string> => {
    await checkTokens(estimateTokensForTask(undefined, prompt.length));
```

`callForTaskBound` (line 141-142):
```ts
  const callForTaskBound = useCallback(async (task: LLMTaskKey, prompt: string): Promise<string> => {
    await checkTokens(estimateTokensForTask(task, prompt.length));
```

`makeWritingCall` (line 159-160, task is always `'coverLetter'`):
```ts
  const makeWritingCall = useCallback(async (prompt: string): Promise<string> => {
    await checkTokens(estimateTokensForTask('coverLetter', prompt.length));
```

`makeAnalysisCall` (line 177-178, task is always `'atsAnalysis'`):
```ts
  const makeAnalysisCall = useCallback(async (prompt: string): Promise<string> => {
    await checkTokens(estimateTokensForTask('atsAnalysis', prompt.length));
```

`generateResumeLatex` (line 196-197, task is always `'resumeLatex'`):
```ts
  const generateResumeLatex = useCallback(async (prompt: string): Promise<string> => {
    await checkTokens(estimateTokensForTask('resumeLatex', prompt.length));
```

`generateCoverLetter` (line 223 — this one currently does **not** call `checkTokens` directly; it calls `makeWritingCall(enhancedPrompt)`, which already checks. No change needed here — confirmed by reading the function body, it has no `checkTokens()` call of its own.)

- [ ] **Step 3: Type-check**

```bash
npx tsc -b
```
Expected: the `useAIService.ts` errors from Task 2 Step 5 are now gone. The `aiProviderContext.tsx` and `JDMatcherPage.tsx` errors remain — fixed in Task 4.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```
Log in, open any page that calls an AI feature (e.g. JD Matcher's "Analyze"), and confirm it still runs successfully end-to-end (no regression from the signature change). This can't be unit-tested without mocking the full provider chain, so this manual check is the verification for this step.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAIService.ts
git commit -m "feat: compute and enforce per-call token estimates in useAIService"
```

---

### Task 4: Align the two remaining `assertSufficientBalance` call sites

**Files:**
- Modify: `src/lib/aiProviderContext.tsx:381-388, 493-500, 513-520` (3 call sites)
- Modify: `src/pages/JDMatcherPage.tsx:246-249` (1 call site)

**Interfaces:**
- Consumes: `InsufficientTokensForCallError` is not needed here — see rationale below.

This task exists because Task 2 changed `assertSufficientBalance`'s required signature. These 4 call sites are **not** part of the new per-task-estimate feature — they're a pre-existing second (redundant) zero-balance check one layer below `useAIService.ts` (in `aiProviderContext.tsx`) and a fixed-cost check for a non-AI-prompt action (PDF compilation in `JDMatcherPage.tsx`). Both get a minimal, behavior-preserving fix.

- [ ] **Step 1: Fix the 3 redundant checks in `aiProviderContext.tsx`**

These three functions (`makeAICall`, `makeAICallWithModel`, `makeAICallWithThinking`) are called *from inside* `useAIService.ts`'s wrappers, which already ran the real per-task estimate check in Task 3 before reaching here. These inner checks only ever tested the zero-balance case (`tokensRemaining <= 0`) — passing `1` preserves that exact behavior (`tokensRemaining < 1` ⟺ `tokensRemaining <= 0` for the integer token counts this system always uses), so this is not a functional change, just a signature fix:

At `src/lib/aiProviderContext.tsx:382` (inside `makeAICall`):
```ts
    try {
      // This inner check only re-verifies the zero-balance case; the real per-call
      // estimate already ran one layer up in useAIService.ts's checkTokens(). Passing 1
      // preserves the existing "any tokens left?" behavior at this layer.
      await assertSufficientBalance(1);
```

At `src/lib/aiProviderContext.tsx:494` (inside `makeAICallWithModel`) — same change:
```ts
    try {
      await assertSufficientBalance(1);
```

At `src/lib/aiProviderContext.tsx:514` (inside `makeAICallWithThinking`) — same change:
```ts
    try {
      await assertSufficientBalance(1);
```

- [ ] **Step 2: Fix the PDF-compile check in `JDMatcherPage.tsx`**

This check gates a LaTeX→PDF compile step, not an AI prompt call — it has a known fixed cost already imported as `PDF_COMPILE_TOKEN_COST`. Use that as the estimate instead of a prompt-length calculation:

At `src/pages/JDMatcherPage.tsx:247`:
```ts
      if (!isAdmin) {
        try { await assertSufficientBalance(PDF_COMPILE_TOKEN_COST); }
        catch { setTokenDialogOpen(true); toast.error('No tokens left.'); return; }
      }
```

(`PDF_COMPILE_TOKEN_COST` is already imported at the top of this file from `@/lib/latexCompiler` — no new import needed.)

- [ ] **Step 3: Type-check — should now be fully clean**

```bash
npx tsc -b
```
Expected: no errors anywhere.

- [ ] **Step 4: Full build**

```bash
rm -rf build && npm run build
```
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/aiProviderContext.tsx src/pages/JDMatcherPage.tsx
git commit -m "fix: align remaining assertSufficientBalance call sites with new signature"
```

---

### Task 5: Shared token-status color helper

**Files:**
- Modify: `src/lib/utils.ts` (add helper)
- Modify: `src/components/TokenBadge.tsx` (use helper instead of inline threshold logic)
- Modify: `src/pages/ProfilePage.tsx:258-259` (use helper instead of inline threshold logic)
- Test: `src/lib/__tests__/utils.test.ts` (new)

**Interfaces:**
- Produces: `export function getTokenStatusColor(remaining: number, allocated: number): string` in `src/lib/utils.ts`, returning one of `'text-green-500' | 'text-yellow-500' | 'text-red-500'`.

This is a pre-existing duplication the codebase already has (both files independently implement the same 40%/15% threshold, one on a 0–1 scale, one on a 0–100 scale) — folding it into one helper directly serves this feature's goal of a consistent Usage display, so it's in scope here (not a drive-by refactor).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/utils.test.ts`:

```ts
import { getTokenStatusColor } from '../utils';

describe('getTokenStatusColor', () => {
  it('returns green above 40% remaining', () => {
    expect(getTokenStatusColor(50, 100)).toBe('text-green-500');
  });

  it('returns yellow between 15% and 40% remaining', () => {
    expect(getTokenStatusColor(20, 100)).toBe('text-yellow-500');
  });

  it('returns red at or below 15% remaining', () => {
    expect(getTokenStatusColor(10, 100)).toBe('text-red-500');
    expect(getTokenStatusColor(0, 100)).toBe('text-red-500');
  });

  it('returns red when allocated is 0 (avoids divide-by-zero)', () => {
    expect(getTokenStatusColor(0, 0)).toBe('text-red-500');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/utils.test.ts`
Expected: FAIL — `getTokenStatusColor` is not exported from `../utils`.

- [ ] **Step 3: Add the helper**

Append to `src/lib/utils.ts`:

```ts
export function getTokenStatusColor(remaining: number, allocated: number): string {
  const pct = allocated > 0 ? remaining / allocated : 0;
  return pct > 0.4 ? 'text-green-500' : pct > 0.15 ? 'text-yellow-500' : 'text-red-500';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/utils.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Use the helper in `TokenBadge.tsx`**

Replace the full contents of `src/components/TokenBadge.tsx`:

```tsx
import { useTokens } from '@/lib/tokenContext';
import { Zap } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn, getTokenStatusColor } from '@/lib/utils';

export function TokenBadge() {
  const { tokensRemaining, tokensAllocated, isLoading, isAdmin } = useTokens();

  if (isLoading) return null;
  if (isAdmin) return (
    <Badge variant="outline" className="gap-1 text-xs">
      <Zap className="h-3 w-3 text-yellow-500" />
      <span>Admin</span>
    </Badge>
  );

  const colorClass = getTokenStatusColor(tokensRemaining, tokensAllocated);

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-xs font-medium cursor-default', colorClass)}
      title={`${tokensRemaining} of ${tokensAllocated} tokens remaining`}
    >
      <Zap className={cn('h-3 w-3', colorClass)} />
      <span>{tokensRemaining} tokens</span>
    </Badge>
  );
}
```

- [ ] **Step 6: Use the helper in `ProfilePage.tsx`**

In `src/pages/ProfilePage.tsx`, add `getTokenStatusColor` to the existing `@/lib/utils`... — there is currently no import from `@/lib/utils` in this file, so add one. Then replace lines 258-259:

Old:
```ts
  const pct = tokensAllocated > 0 ? (tokensRemaining / tokensAllocated) * 100 : 0;
  const tokenColor = pct > 40 ? 'text-green-500' : pct > 15 ? 'text-yellow-500' : 'text-red-500';
```

New:
```ts
  const pct = tokensAllocated > 0 ? (tokensRemaining / tokensAllocated) * 100 : 0;
  const tokenColor = getTokenStatusColor(tokensRemaining, tokensAllocated);
```

(`pct` on a 0–100 scale is still used by the progress-bar width at line 302 — keep it; only the color derivation changes.)

Add the import near the top of `src/pages/ProfilePage.tsx` (alongside the other `@/lib/...` imports, e.g. after the `firebaseWeb` import):
```ts
import { getTokenStatusColor } from '@/lib/utils';
```

- [ ] **Step 7: Type-check and manual visual check**

```bash
npx tsc -b
npm run dev
```
Log in, confirm the header `TokenBadge` and Profile page's token color still render the same as before (no visual regression — this step only changed *where* the threshold logic lives, not its values).

- [ ] **Step 8: Commit**

```bash
git add src/lib/utils.ts src/lib/__tests__/utils.test.ts src/components/TokenBadge.tsx src/pages/ProfilePage.tsx
git commit -m "refactor: extract shared getTokenStatusColor helper, dedupe TokenBadge/ProfilePage"
```

---

### Task 6: Token info dialog (static content)

**Files:**
- Create: `src/components/TokenInfoDialog.tsx`

**Interfaces:**
- Produces: `TokenInfoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void })` — same prop shape as the existing `RequestTokensDialog`. Tasks 7 and 8's icon triggers both mount this component with their own local `open` state.

- [ ] **Step 1: Create the component**

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertCircle } from 'lucide-react';

interface TokenInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEATURE_COSTS: { feature: string; cost: string }[] = [
  { feature: 'Tailoring a resume to a job description', cost: 'Higher' },
  { feature: 'ATS / keyword match analysis', cost: 'Medium' },
  { feature: 'Cover letter generation', cost: 'Medium' },
  { feature: 'Job-fit check', cost: 'Lower' },
  { feature: 'Resume upload parsing', cost: 'Medium' },
  { feature: 'Resume score', cost: 'Lower' },
];

const REDUCTION_TIPS: string[] = [
  'Reuse a saved resume instead of re-uploading and re-parsing the same file.',
  "Only use \"Recalculate\" on the Resume Score page when you've actually changed something.",
  'For small job-description tweaks, edit the tailored resume directly rather than re-running full tailoring.',
  "Use the job-fit check before running full ATS analysis and tailoring on a long-shot posting — if it's not a great match, you'll be asked before the app spends tokens on the rest.",
];

export function TokenInfoDialog({ open, onOpenChange }: TokenInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> How tokens are used
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Typical cost by feature</p>
            <div className="rounded-md border divide-y">
              {FEATURE_COSTS.map(({ feature, cost }) => (
                <div key={feature} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{feature}</span>
                  <span className="text-xs text-muted-foreground font-medium">{cost}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Smart ways to reduce usage</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
              {REDUCTION_TIPS.map(tip => <li key={tip}>{tip}</li>)}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">1 token ≈ 750 characters of AI output.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc -b
```
Expected: no errors. (This component has no interactive logic to unit test — it's static content, verified visually in Task 7.)

- [ ] **Step 3: Commit**

```bash
git add src/components/TokenInfoDialog.tsx
git commit -m "feat: add static token-cost info dialog"
```

---

### Task 7: Wire the info-icon trigger into the header and Profile page

**Files:**
- Modify: `src/components/WebHeader.tsx`
- Modify: `src/pages/ProfilePage.tsx`

**Interfaces:**
- Consumes: `TokenInfoDialog` from Task 6.

- [ ] **Step 1: Add the trigger next to `TokenBadge` in `WebHeader.tsx`**

Add `AlertCircle` to the existing lucide-react import (line 7) and `TokenInfoDialog` import:

```ts
import { LayoutList, ShieldCheck, FileText, Target, BarChart3, LogOut, User, UserCircle, Zap, Sun, Moon, AlertCircle } from "lucide-react";
```
```ts
import { TokenInfoDialog } from "./TokenInfoDialog";
```

Add local state near the existing `tokenDialogOpen` state (line 34):
```ts
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenInfoOpen, setTokenInfoOpen] = useState(false);
```

Replace the `<TokenBadge />` line (62) with:
```tsx
                <TokenBadge />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setTokenInfoOpen(true)}
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">How tokens are used</TooltipContent>
                </Tooltip>
```

Mount the dialog alongside the existing `<RequestTokensDialog ... />` at the bottom of the component (line 150):
```tsx
    <RequestTokensDialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen} />
    <TokenInfoDialog open={tokenInfoOpen} onOpenChange={setTokenInfoOpen} />
    </>
  );
};
```

- [ ] **Step 2: Add the trigger to `ProfilePage.tsx`'s existing Account card**

In `src/pages/ProfilePage.tsx`, add to the lucide-react import (line 13) and add the `TokenInfoDialog` import:
```ts
import { ArrowLeft, Save, RefreshCw, Zap, Download, Upload, RotateCcw, Settings, Sparkles, FileText, AlertCircle } from 'lucide-react';
```
```ts
import { TokenInfoDialog } from '@/components/TokenInfoDialog';
```

Add local state near the existing `tokenDialogOpen` state (line 71):
```ts
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenInfoOpen, setTokenInfoOpen] = useState(false);
```

In the Account card's `CardHeader` (lines 276-278), add the icon next to the "Account" label:
```tsx
          <CardHeader>
            <div className="font-semibold text-sm flex items-center gap-1.5">
              Account
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 -mb-0.5"
                onClick={() => setTokenInfoOpen(true)}
              >
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
```

Mount the dialog alongside the existing `<RequestTokensDialog ... />` (line 463):
```tsx
      <RequestTokensDialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen} />
      <TokenInfoDialog open={tokenInfoOpen} onOpenChange={setTokenInfoOpen} />
```

- [ ] **Step 3: Type-check**

```bash
npx tsc -b
```
Expected: no errors.

- [ ] **Step 4: Manual visual check**

```bash
npm run dev
```
Log in, click the exclamation icon next to the header token badge — confirm the dialog opens with the feature-cost table and tips. Navigate to `/profile`, click the exclamation icon next to "Account" — confirm the same dialog opens there.

- [ ] **Step 5: Commit**

```bash
git add src/components/WebHeader.tsx src/pages/ProfilePage.tsx
git commit -m "feat: add token-info dialog trigger to header and Profile page"
```

---

### Task 8: Global "AI functions disabled" banner

**Files:**
- Create: `src/components/InsufficientTokensBanner.tsx`
- Modify: `src/AuthWrapper.tsx`

**Interfaces:**
- Consumes: `useTokens()` (existing), `RequestTokensDialog` (existing).
- Produces: `InsufficientTokensBanner` — no props, self-contained.

- [ ] **Step 1: Create the banner**

```tsx
import { useState } from 'react';
import { useTokens } from '@/lib/tokenContext';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';
import { RequestTokensDialog } from './RequestTokensDialog';

export function InsufficientTokensBanner() {
  const { tokensRemaining, isAdmin, isLoading } = useTokens();
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);

  if (isLoading || isAdmin || tokensRemaining > 0) return null;

  return (
    <>
      <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-2.5">
        <div className="container flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>AI functions disabled — you're out of tokens. Request more, or contact support if this looks wrong.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setTokenDialogOpen(true)}>
              Request Tokens
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href="mailto:sreehariprathap1996@gmail.com" target="_blank" rel="noreferrer">
                Contact Support
              </a>
            </Button>
          </div>
        </div>
      </div>
      <RequestTokensDialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen} />
    </>
  );
}
```

- [ ] **Step 2: Mount it in `AuthWrapper.tsx`**

Replace the full contents of `src/AuthWrapper.tsx`:

```tsx
import { useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { initUserProfile } from "@/lib/firebaseWeb";
import { AuthScreen } from "./components/AuthScreen";
import { WebHeader } from "./components/WebHeader";
import { WebFooter } from "./components/WebFooter";
import { InsufficientTokensBanner } from "./components/InsufficientTokensBanner";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      void initUserProfile(
        currentUser.uid,
        currentUser.email ?? '',
        currentUser.displayName ?? ''
      ).catch((err) => {
        console.warn('[auth] initUserProfile failed', err);
      });
    }
  }, [currentUser]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="container p-4 flex items-center justify-center" style={{ height: "100vh" }}>
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If not authenticated, show the auth screen
  if (!isAuthenticated) {
    return (
      <div className="auth-wrapper container p-4">
        <AuthScreen />
      </div>
    );
  }

  // Otherwise render the app content with web header and footer
  return (
    <>
      <WebHeader />
      <InsufficientTokensBanner />
      <div className="container py-8">{children}</div>
      <WebFooter />
    </>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc -b
```
Expected: no errors.

- [ ] **Step 4: Manual verification (per spec §7)**

This requires a test account with `tokensRemaining` at 0. Options: use the Admin page's user table (`/admin`) to set a test user's `tokensAllocated`/`tokensUsed` so `tokensRemaining` computes to 0, or temporarily edit the Firestore doc directly. Log in as that user and confirm:
- The banner appears below the header on every route (try `/`, `/tracker`, `/profile`, `/resume`).
- It does not have a close/dismiss control.
- "Request Tokens" opens the request dialog and submits correctly.
- "Contact Support" opens a mail client to `sreehariprathap1996@gmail.com`.
- An admin account never sees the banner regardless of its token fields.

- [ ] **Step 5: Commit**

```bash
git add src/components/InsufficientTokensBanner.tsx src/AuthWrapper.tsx
git commit -m "feat: add persistent AI-functions-disabled banner for zero token balance"
```

---

### Task 9: Documentation updates

**Files:**
- Modify: `docs/web/overview.md:35`
- Modify: `src/config/llm.config.md`
- Modify: `docs/llm-calls-and-distributions.md`

- [ ] **Step 1: Update `docs/web/overview.md`**

Replace line 35:
```
- AI actions use tokens. You can see your balance in the top bar.
```
with:
```
- AI actions use tokens. See your balance in the top bar, or open Profile → Account for the full breakdown (allocated / used / remaining) and a cost-per-feature explainer (click the exclamation icon next to the token badge or the Account heading). If you run out, AI features are disabled and a banner appears with options to request more tokens or contact support.
```

- [ ] **Step 2: Document the new exports in `src/config/llm.config.md`**

Append a new section at the end of `src/config/llm.config.md`:

```markdown

---

## Pre-Flight Token Cost Estimates

`TASK_TOKEN_MULTIPLIERS` (and the `DEFAULT_TOKEN_MULTIPLIER` fallback for the one untyped call path) give each task key a rough cost-per-prompt-character multiplier, used by `estimateTokensForTask(taskKey, promptChars)` to decide — before a call is made — whether the user has enough tokens left for it.

**This does not change how calls are actually billed.** Billing stays exactly as documented above: post-hoc, from the real response length, at `750 output chars = 1 token`. The multiplier table only gates whether a call is allowed to start (see `src/lib/tokenContext.tsx`'s `evaluateTokenBalance` / `assertSufficientBalance`).

Tune a task's multiplier in `TASK_TOKEN_MULTIPLIERS` if it's consistently triggering false "not enough tokens" blocks (multiplier too high) or letting calls through that then fail mid-billing on a much larger real balance (multiplier too low).
```

- [ ] **Step 3: Cross-reference from `docs/llm-calls-and-distributions.md`**

In `docs/llm-calls-and-distributions.md`, after the existing "How to configure" bullet list near the top, add:

```markdown
- Pre-flight token cost estimates (used to gate a call before it runs) are configured per task key in `TASK_TOKEN_MULTIPLIERS` — see `src/config/llm.config.md` § Pre-Flight Token Cost Estimates. Not duplicated into the table below to avoid two sources of truth.
```

- [ ] **Step 4: Commit**

```bash
git add docs/web/overview.md src/config/llm.config.md docs/llm-calls-and-distributions.md
git commit -m "docs: document per-call token estimates, usage section, and disabled-AI banner"
```
