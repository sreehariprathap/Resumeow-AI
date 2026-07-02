# JD Matcher — Job-Fit Gate Before Auto-Tailoring — Design Spec
**Date:** 2026-07-01
**Status:** Approved
**Author:** Brainstorming session

---

## 1. Overview

`handleGenerateTailored()` in `src/pages/JDMatcherPage.tsx` runs a 4-step pipeline automatically: Job Fit (Step 1) → Keyword/ATS analysis (Step 2) → LaTeX generation (Step 3) → PDF compile (Step 4). Today Step 1's fit score is computed and displayed but never gates anything — the pipeline always proceeds straight through, spending tokens on ATS analysis, LaTeX generation, and PDF compilation even when Step 1 itself already determined the job is a poor match.

This spec adds a pause point after Step 1: if the fit score is below 50, stop and ask the user whether to continue, instead of silently burning tokens on a job that's already been flagged as a weak match.

**Scope confirmed with user:** only this pipeline. The separate "Analyze" button (`handleAnalyze`, computing a different `overallScore` match report) is a distinct, already-opt-in action and is unaffected.

---

## 2. Behavior Change

### 2.1 Trigger

After Step 1 completes inside `handleGenerateTailored()`:

```ts
const jf = JSON.parse(jobFitMatch[0]); // existing code
setStepResults(prev => ({ ...prev, jobFit: { score: jf.fitScore, label: jf.label } })); // existing code

// NEW:
if (jf.fitScore < 50) {
  setPendingLowFitConfirm({ score: jf.fitScore, label: jf.label });
  return; // pause here — do not advance to Step 2
}
```

### 2.2 UI

Replace the step-progress card (the existing `isGeneratingResume` inline card at ~line 505 of `JDMatcherPage.tsx`) with a confirmation prompt when `pendingLowFitConfirm` is set — same card container styling as the existing step-progress card (`rounded-xl border bg-card p-5`), not a separate modal:

> *"This job scored {score}/100 ({label}) — not a great match. Do you want to continue with ATS analysis and tailoring anyway?"*
> **[Continue Anyway]** **[Cancel]**

- **Continue Anyway** — clears `pendingLowFitConfirm`, resumes from Step 2 using the **already-computed** `stepResults.jobFit` — the Step 1 AI call is not re-run (no wasted tokens; ties into the token-usage-reduction tip already written into spec A's info dialog content, §5).
- **Cancel** — resets `isGeneratingResume` to `false` and clears `pendingLowFitConfirm`, returning to the initial "Generate Tailored Resume as PDF" button state. User can edit the JD text and retry.
- Score `>= 50` — unchanged, pipeline proceeds through Steps 2–4 automatically exactly as today.

### 2.3 New State

```ts
const [pendingLowFitConfirm, setPendingLowFitConfirm] = useState<{ score: number; label: string } | null>(null);
```

`handleGenerateTailored` needs restructuring so Steps 2–4 can be invoked either immediately (score >= 50) or from the "Continue Anyway" handler (score < 50, after the pause) without duplicating the Step 2–4 logic — extract that portion into a local function the two call sites share.

---

## 3. Documentation Updates

- **`docs/web/jd-matcher.md`** — currently only describes the "Analyze" match-score flow; it doesn't mention the "Generate Tailored Resume as PDF" pipeline at all. Add a new section describing that pipeline's steps (Job Fit → ATS analysis → LaTeX → PDF), and document the new gate: *"If the job scores below 50 on the fit check, you'll be asked to confirm before the app spends tokens on full tailoring."*

---

## 4. Testing Notes

- Unit/component test: mock the job-fit AI call to return `fitScore: 35`, confirm the pipeline stops after Step 1 and shows the confirmation prompt rather than advancing to Step 2.
- Confirm "Continue Anyway" does not re-invoke the job-fit AI call (assert the mock was called exactly once).
- Confirm "Cancel" returns the page to the pre-generation state (`isGeneratingResume === false`) and that clicking "Generate Tailored Resume as PDF" again starts a fresh run.
- Confirm `fitScore: 50` and above proceed automatically with no prompt (boundary check — spec says "less than 50%", so 50 itself is not gated).
