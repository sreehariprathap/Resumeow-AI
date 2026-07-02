# Token Usage Guardrails & Transparency — Design Spec
**Date:** 2026-07-01
**Status:** Approved
**Author:** Brainstorming session

---

## 1. Overview

Upgrades the app's existing token system from a binary "do you have any tokens left" gate into a per-call-aware guardrail, and adds transparency around how tokens are spent. Four deliverables:

| # | Deliverable | Scope |
|---|---|---|
| 1 | **Per-call pre-flight estimate** | Upgrade `assertSufficientBalance` to estimate a specific call's cost from its prompt length × a per-task multiplier, and block only that call if short |
| 2 | **Global "AI functions disabled" banner** | Persistent, non-dismissible bar shown app-wide when `tokensRemaining <= 0` |
| 3 | **Profile → Usage section** | Aggregate allocated/used/remaining display on the Profile page |
| 4 | **Token info dialog** | Exclamation-icon-triggered dialog explaining per-feature costs and usage-reduction tips |

**Existing infrastructure this builds on** (verified present, not being rebuilt):
- `src/lib/tokenContext.tsx` — `TokenProvider`, `useTokens()`, `deductTokens()`, `assertSufficientBalance()`.
- `src/hooks/useAIService.ts` — every AI call path (`callForTask`, `makeAnalysisCall`, `makeWritingCall`, `generateResumeLatex`, `generateCoverLetter`, `makeAICall`) already calls `checkTokens()` before dispatching. Audited all call sites (`ResumeEditorModal`, `OnboardingWizard`, `ResumeLaTeXGenerator`, `DuplicateModal`, `CoverLetterGenerator`, `ExtrasStep`, `ResumeUploadStep`, `JDMatcherPage`, `LazyModePage`, `ResumeScoringPage`, `ResumeGeneratorPage`, `ProfilePage`) — none bypass `useAIService`, so pre-flight coverage is already complete. This spec upgrades the check itself, not its coverage.
- `src/components/RequestTokensDialog.tsx` — existing request form, reused (not rebuilt) for both the banner CTA and the per-action shortfall path.
- `src/components/TokenBadge.tsx` — existing header badge with green/yellow/red threshold logic (`pct > 0.4` / `> 0.15` / else), reused for the Usage section's progress bar.
- `mailto:sreehariprathap1996@gmail.com` — existing support contact pattern from `WebFooter.tsx`, reused for the banner's "Contact Support" link.

**Explicitly out of scope:** per-call usage history (which feature used how many tokens, when). The app currently stores only aggregate `tokensAllocated` / `tokensUsed` / `tokensRemaining` on the user profile; adding a history log would mean new Firestore writes on every AI call plus retention/cleanup design. Confirmed with user to keep this out — Usage section shows aggregate numbers only, and the info dialog is a static explainer, not a personalized log.

---

## 2. Per-Call Pre-Flight Estimate

### 2.1 Principle

**This estimate only gates whether a call is allowed to start. It does not change actual billing.** Real deduction remains exactly as today — post-hoc, via `deductTokens(outputChars)` in `useAIService.ts`'s `bill()` helper, based on the real response's character count at `750 chars = 1 token`. The pre-flight estimate reuses that same `750`-char ratio, applied to the *prompt* instead of the response, scaled by a per-task multiplier.

### 2.2 `TASK_TOKEN_MULTIPLIERS`

New export in `src/config/llm.config.ts`, alongside the existing `LLMTaskKey` union:

```ts
/**
 * Pre-flight cost estimate multiplier, applied to a call's prompt length.
 * estimatedTokens = ceil((promptChars * multiplier) / 750)
 * Calibrated against typical output size for each task, independent of
 * how large the prompt itself is (e.g. resumeLatex takes a large profile-JSON
 * prompt but produces a fairly fixed-size LaTeX document; extractJobDetails
 * takes a large JD prompt but produces a tiny JSON blob).
 * These are estimates for gating only — see §2.1.
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

/** Fallback multiplier for the one untyped call path (JDMatcherPage's initial makeAICall). */
export const DEFAULT_TOKEN_MULTIPLIER = 0.9;
```

These are starting estimates, not measured averages — tune later from real usage once the app has been running with this system for a while. Being conservative (slightly over-estimating) is preferable to under-estimating, since under-estimating lets a call through that then fails mid-billing.

### 2.3 `tokenContext.tsx` changes

```ts
// estimateTokensForTask(taskKey: LLMTaskKey | undefined, promptChars: number): number
//   Math.max(1, Math.ceil(promptChars * (TASK_TOKEN_MULTIPLIERS[taskKey] ?? DEFAULT_TOKEN_MULTIPLIER) / 750))

assertSufficientBalance(estimatedTokens: number): Promise<void>
```

Behavior:
- Fetches fresh balance from Firestore (unchanged — still fails open on offline/permission error, matching current behavior).
- Admin: always passes (unchanged).
- `tokensRemaining <= 0`: throws `new Error('INSUFFICIENT_TOKENS')` (unchanged — drives the global banner, §3).
- `0 < tokensRemaining < estimatedTokens`: throws a new `InsufficientTokensForCallError` carrying `{ needed: estimatedTokens, remaining: tokensRemaining }` (drives the per-action toast, §2.4). Distinct from `INSUFFICIENT_TOKENS` so call sites — and the future maintainer reading a catch block — can tell "you're fully out" from "you're a bit short for this one thing" without re-deriving the comparison.
- Otherwise: passes.

### 2.4 `useAIService.ts` changes

`checkTokens()` gains a required `estimatedTokens` argument, computed by each wrapper from its own prompt string via `estimateTokensForTask`. Each of the six call-site wrappers (`makeAICallWithRetry`, `callForTaskBound`, `makeWritingCall`, `makeAnalysisCall`, `generateResumeLatex`, `generateCoverLetter`) passes its task key (or `undefined` for the generic `makeAICall` path, falling back to `DEFAULT_TOKEN_MULTIPLIER`) and its own prompt's length.

`handleAIError` (or a new small handler alongside it) gains a branch for `InsufficientTokensForCallError`:
```
toast.error(`This needs ~${needed} tokens, you have ${remaining} left.`)
// then open RequestTokensDialog via the existing onInsufficientTokens callback
```
This reuses the exact callback plumbing that already exists for `INSUFFICIENT_TOKENS` (`opts?.onInsufficientTokens`) — no new wiring pattern, just a second error type feeding the same callback.

---

## 3. Global "AI Functions Disabled" Banner

### 3.1 Component

New `src/components/InsufficientTokensBanner.tsx`:
- Reads `tokensRemaining`, `isAdmin`, `isLoading` from `useTokens()`.
- Renders `null` while loading, for admins, or when `tokensRemaining > 0`.
- Otherwise renders a full-width bar: *"AI functions disabled — you're out of tokens. Request more, or contact support if this looks wrong."*
- Two buttons: **Request Tokens** (opens `RequestTokensDialog`, state owned by this component) and **Contact Support** (`mailto:sreehariprathap1996@gmail.com`, `target="_blank"` consistent with `WebFooter.tsx`).
- No dismiss/close control — the bar reflects real account state and should stay visible until resolved (confirmed with user).

### 3.2 Mounting

Mounted once in `src/AuthWrapper.tsx`, immediately below `<WebHeader />`:

```tsx
return (
  <>
    <WebHeader />
    <InsufficientTokensBanner />
    <div className="container py-8">{children}</div>
    <WebFooter />
  </>
);
```

This makes it app-wide (every authenticated route) without per-page wiring. Existing per-page `RequestTokensDialog` instances (e.g. in `JDMatcherPage.tsx`, `WebHeader.tsx`'s Account dropdown) are unaffected — they remain for their own "Request Tokens" entry points; the banner owns its own dialog instance rather than sharing state across components, keeping it self-contained per the existing per-page pattern already in use.

---

## 4. Profile → Usage Section

New card in `src/pages/ProfilePage.tsx`, near the existing profile sections:
- Plan badge (`free` / `pro` / `admin`), reusing the badge variant logic already used in `AdminPage.tsx`'s user table (`admin` → destructive, `pro` → default, `free` → secondary).
- Three numbers: Allocated, Used, Remaining (`tokensAllocated`, `tokensUsed`, `tokensRemaining` from `useTokens()`).
- A progress bar (allocated vs. remaining), colored via the same threshold logic as `TokenBadge.tsx` (`pct > 0.4` green / `> 0.15` yellow / else red) — extract that threshold logic into a small shared helper (`getTokenStatusColor(pct)` in `src/lib/utils.ts` or similar) so `TokenBadge` and the new Usage card don't duplicate the three-way threshold.
- The exclamation-icon trigger for the token info dialog (§5), placed next to the section heading.
- Admins see "Unlimited" instead of the numeric breakdown (matching the `∞` treatment already used for admins in `AdminPage.tsx`'s user table).

---

## 5. Token Info Dialog

New `src/components/TokenInfoDialog.tsx`, a plain controlled dialog (`open`/`onOpenChange` props, same shape as `RequestTokensDialog`) with static content — not personalized, not fetched, just informational copy:

**Section 1 — How tokens are consumed:** a small table, one row per user-facing feature (not raw `LLMTaskKey` names), described qualitatively rather than with exact numbers so it doesn't need to stay in sync with `TASK_TOKEN_MULTIPLIERS` as that table gets tuned:

| Feature | Typical cost |
|---|---|
| Tailoring a resume to a job description | Higher |
| ATS / keyword match analysis | Medium |
| Cover letter generation | Medium |
| Job-fit check | Lower |
| Resume upload parsing | Medium |
| Resume score | Lower |

**Section 2 — Smart ways to reduce usage:** a short bulleted list, e.g.:
- Reuse a saved resume instead of re-uploading and re-parsing the same file.
- Only use "Recalculate" on the Resume Score page when you've actually changed something.
- For small job-description tweaks, edit the tailored resume directly rather than re-running full tailoring.
- Use the job-fit check before running full ATS analysis + tailoring on a long-shot posting (ties into spec B).

### 5.1 Two trigger points, one component

- Header: small exclamation icon next to `TokenBadge` in `WebHeader.tsx`'s Account dropdown area (or directly beside the badge in the header row — implementation detail decided during planning).
- Profile: exclamation icon in the new Usage section (§4).

Both mount the same `TokenInfoDialog`, each owning its own `open` state locally (no shared/global dialog state needed — it's read-only, stateless content).

---

## 6. Error Handling & Edge Cases

- **Offline / Firestore permission error during `assertSufficientBalance`**: unchanged — fails open (logs a warning, lets the call proceed) rather than blocking users when the balance check itself can't complete. This existing behavior is preserved for both the zero-balance and partial-shortfall paths.
- **Admin accounts**: never blocked, never see the banner, Usage section shows "Unlimited". Unchanged from today.
- **Race between banner and in-flight call**: if a call is mid-flight when the balance crosses zero, it completes normally (billing already fetches a fresh balance server-side via `fbDeductTokens`, which is authoritative — see existing comment in `tokenContext.tsx`: "Firestore is authoritative — skip stale local pre-check, let the DB decide"). The banner and pre-flight check are UX guardrails, not the source of truth for whether a deduction succeeds.

---

## 7. Testing Notes

- Unit test `estimateTokensForTask` for a few task/prompt-length combinations, including the `undefined` task key fallback.
- Unit test `assertSufficientBalance`'s three branches (zero balance / partial shortfall / sufficient), mocking `getUserProfile`.
- Manual verification: force `tokensRemaining` to 0 for a test account and confirm the banner appears on every route and the dialog buttons work; force a small positive remaining balance and trigger a high-multiplier task (e.g. `resumeLatex`) to confirm the per-action toast path fires instead of the banner.
