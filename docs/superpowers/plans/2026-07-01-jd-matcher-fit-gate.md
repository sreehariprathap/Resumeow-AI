# JD Matcher Job-Fit Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pause the JD Matcher's one-click "Generate Tailored Resume" pipeline after its Step 1 job-fit check when the score is below 50, and ask the user to confirm before spending tokens on ATS analysis, LaTeX generation, and PDF compilation.

**Architecture:** `handleGenerateTailored()` in `JDMatcherPage.tsx` is split into two functions: the existing function now only runs Step 1 and either continues automatically (score ≥ 50) or pauses into a new `pendingLowFitConfirm` state (score < 50); a new `continueTailoring(profile)` function holds the extracted Steps 2–4 logic, callable both from the automatic path and from a "Continue Anyway" handler — so Step 1's AI call is never re-run.

**Tech Stack:** React, TypeScript, Jest (pure-function unit test for the boundary condition — this codebase's existing tests don't render React components with Testing Library, so the state-machine wiring itself is verified manually per Task 1 Step 6).

## Global Constraints

- Gate applies only to `handleGenerateTailored()` (the tailoring pipeline). The separate "Analyze" button (`handleAnalyze`, a different `overallScore`) is unaffected — confirmed in design.
- Boundary: score exactly 50 is **not** gated (spec says "less than 50%"); only `< 50` pauses.
- "Continue Anyway" must not re-invoke the Step 1 AI call (token-usage principle from the companion token-guardrails spec).

---

### Task 1: Gate the pipeline on low fit score

**Files:**
- Modify: `src/pages/JDMatcherPage.tsx` (state, `handleGenerateTailored`, new `continueTailoring`/handlers, render)
- Test: `src/pages/__tests__/jdMatcherFitGate.test.ts` (new — pure boundary-condition test)

**Interfaces:**
- Produces: `shouldPauseForLowFit(score: number): boolean` (pure, exported for the test) used by `handleGenerateTailored`. New component state `pendingLowFitConfirm: { score: number; label: string; profile: ResumeProfile } | null`. New handlers `handleContinueLowFit`, `handleCancelLowFit`.

- [ ] **Step 1: Write the failing test for the boundary condition**

Create `src/pages/__tests__/jdMatcherFitGate.test.ts`:

```ts
import { shouldPauseForLowFit } from '../JDMatcherPage';

describe('shouldPauseForLowFit', () => {
  it('pauses below 50', () => {
    expect(shouldPauseForLowFit(49)).toBe(true);
    expect(shouldPauseForLowFit(0)).toBe(true);
  });

  it('does not pause at exactly 50', () => {
    expect(shouldPauseForLowFit(50)).toBe(false);
  });

  it('does not pause above 50', () => {
    expect(shouldPauseForLowFit(51)).toBe(false);
    expect(shouldPauseForLowFit(100)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/pages/__tests__/jdMatcherFitGate.test.ts`
Expected: FAIL — `shouldPauseForLowFit` is not exported from `../JDMatcherPage`.

- [ ] **Step 3: Add the exported pure helper**

In `src/pages/JDMatcherPage.tsx`, add near the top of the file (after the existing `ScoreGauge` function, before `export function JDMatcherPage()`):

```ts
/** Exported for testing — the single source of truth for the low-fit-score gate boundary. */
export function shouldPauseForLowFit(score: number): boolean {
  return score < 50;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/pages/__tests__/jdMatcherFitGate.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Add state and restructure `handleGenerateTailored`**

Add new state near the existing `stepResults` state declaration (`src/pages/JDMatcherPage.tsx`, after the block ending `}>({ jobFit: null, keywords: null });`):

```ts
  const [pendingLowFitConfirm, setPendingLowFitConfirm] = useState<{
    score: number; label: string; profile: ResumeProfile;
  } | null>(null);
```

Replace the full `handleGenerateTailored` function (currently spanning from `const handleGenerateTailored = async () => {` through its closing `};`, i.e. lines 170-278) with:

```ts
  const handleGenerateTailored = async () => {
    if (!result || !currentUser) return;
    setIsGeneratingResume(true);
    setStepResults({ jobFit: null, keywords: null });

    let profile: ResumeProfile;
    try {
      const profileData = await getUserData(currentUser.uid, 'resumeProfile');
      if (!profileData) throw new Error('No profile');
      profile = profileData as ResumeProfile;

      // ── Step 1: Job Fit ────────────────────────────────────────────────────
      setGenerationStep(1);
      const jobFitPrompt = `You are a strict hiring gatekeeper. Analyze this job description for MANDATORY requirements and check the resume against each one.

JOB DESCRIPTION:
${jdText}

RESUME PROFILE:
${JSON.stringify(profile, null, 2)}

Return ONLY valid JSON: { "fitScore": <0-100>, "label": "<Great Match|Decent Match|Tough Match|Not a Fit>", "mandatoryRequirements": [], "summary": "<2 sentence verdict>" }`;

      const jobFitRaw = await callForTask('jobFit', jobFitPrompt);
      const jobFitMatch = jobFitRaw.match(/\{[\s\S]*\}/);
      if (jobFitMatch) {
        const jf = JSON.parse(jobFitMatch[0]);
        setStepResults(prev => ({ ...prev, jobFit: { score: jf.fitScore, label: jf.label } }));

        if (shouldPauseForLowFit(jf.fitScore)) {
          setPendingLowFitConfirm({ score: jf.fitScore, label: jf.label, profile });
          // isGeneratingResume and generationStep stay as-is (true / 1) — the render
          // logic shows the confirm card instead of the step-progress card while
          // pendingLowFitConfirm is set. Not reset here; only the error path below
          // and continueTailoring's own finally reset them.
          return;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_TOKENS') {
        setTokenDialogOpen(true);
      } else {
        toast.error('Failed to generate tailored resume.');
        console.error(err);
      }
      setIsGeneratingResume(false);
      setGenerationStep(0);
      return;
    }

    await continueTailoring(profile);
  };

  // Steps 2–4, extracted so both the automatic path (score >= 50) and the
  // "Continue Anyway" handler can run them without re-invoking Step 1's AI call.
  const continueTailoring = async (profile: ResumeProfile) => {
    if (!result) { setIsGeneratingResume(false); setGenerationStep(0); return; }
    try {
      // ── Step 2: Keyword Analysis ───────────────────────────────────────────
      setGenerationStep(2);
      const keywordPrompt = `Analyze this resume against the job description for keyword and ATS compatibility.

JOB DESCRIPTION:
${jdText}

RESUME PROFILE:
${JSON.stringify(profile, null, 2)}

Return ONLY valid JSON: { "overall": <0-100>, "keywordMatch": <0-100>, "missingKeywords": ["..."], "matchedKeywords": ["..."], "recommendations": ["..."] }`;

      const keywordRaw = await callForTask('combinedATS', keywordPrompt);
      const keywordMatch = keywordRaw.match(/\{[\s\S]*\}/);
      if (keywordMatch) {
        const kw = JSON.parse(keywordMatch[0]);
        setStepResults(prev => ({
          ...prev,
          keywords: {
            matched: (kw.matchedKeywords ?? []).length,
            missing: (kw.missingKeywords ?? []).length,
          },
        }));
      }

      // ── Step 3: LaTeX Resume ───────────────────────────────────────────────
      setGenerationStep(3);
      const improvedProfile: ResumeProfile = {
        ...profile,
        experiences: profile.experiences.map(exp => ({
          ...exp,
          bullets: exp.bullets.map(bullet => {
            const match = result!.tailoredBullets.find(
              tb => bullet.toLowerCase().includes(tb.original.toLowerCase().slice(0, 30))
            );
            return match ? match.improved : bullet;
          }),
        })),
      };
      setGeneratedProfile(improvedProfile);

      const latex = await generateResumeLatex(
        `Generate a professional LaTeX resume for:\n${JSON.stringify(improvedProfile, null, 2)}`
      );
      sessionStorage.setItem('generatedLatex', latex);

      // ── Step 4: PDF Compile ────────────────────────────────────────────────
      if (!isAdmin) {
        try { await assertSufficientBalance(PDF_COMPILE_TOKEN_COST); }
        catch { setTokenDialogOpen(true); toast.error('No tokens left.'); return; }
      }
      setGenerationStep(4);
      setPdfBlob(null);
      setCompileError(null);
      setIsCompiling(true);
      setIsPdfOpen(true);
      try {
        const blob = await compileLatexToPdf(latex);
        setPdfBlob(blob);
        setGenerationStep(5);
        if (!isAdmin) { void deductTokens(PDF_COMPILE_TOKEN_COST); }
      } catch (compileErr) {
        const log = compileErr instanceof LatexCompileError ? compileErr.log : String(compileErr);
        setCompileError(log);
        toast.error('PDF preview unavailable — resume saved, go to /resume page.');
        navigate('/resume');
      } finally {
        setIsCompiling(false);
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_TOKENS') {
        setTokenDialogOpen(true); return;
      }
      toast.error('Failed to generate tailored resume.');
      console.error(err);
    } finally {
      setIsGeneratingResume(false);
      setGenerationStep(0);
    }
  };

  const handleContinueLowFit = () => {
    if (!pendingLowFitConfirm) return;
    const { profile } = pendingLowFitConfirm;
    setPendingLowFitConfirm(null);
    void continueTailoring(profile);
  };

  const handleCancelLowFit = () => {
    setPendingLowFitConfirm(null);
    setIsGeneratingResume(false);
    setGenerationStep(0);
  };
```

**Note on `assertSufficientBalance(PDF_COMPILE_TOKEN_COST)`:** this call already requires an argument as of the companion token-usage-guardrails plan (Task 4 there). If that plan hasn't landed yet, use `assertSufficientBalance()` (no argument) here instead, matching this file's current signature — check `src/lib/tokenContext.tsx`'s `assertSufficientBalance` signature before writing this line.

- [ ] **Step 6: Type-check**

```bash
npx tsc -b
```
Expected: no errors. If `result!.tailoredBullets` in Step 3 shows a strict-null-check error, confirm `result` is non-null at that point (guaranteed by the early `if (!result) { ...; return; }` at the top of `continueTailoring`) — the non-null assertion is safe there since TypeScript can't narrow across the closure boundary automatically.

- [ ] **Step 7: Manual verification**

```bash
npm run dev
```
1. Log in, go to JD Matcher, paste a job description, run "Analyze".
2. Click "Generate Tailored Resume as PDF". If the job-fit score comes back below 50, confirm the pipeline stops after Step 1 and does not silently continue to Step 2.
3. This will be visually rendered as the existing step-progress card until Task 2 adds the confirm-card UI — for now, verify via the browser console / React DevTools that `pendingLowFitConfirm` is set and `generationStep` stays at `1`.
4. Test a job description likely to score ≥ 50 and confirm the pipeline still runs straight through to PDF compile with no pause (no regression).

- [ ] **Step 8: Commit**

```bash
git add src/pages/JDMatcherPage.tsx src/pages/__tests__/jdMatcherFitGate.test.ts
git commit -m "feat: pause tailoring pipeline for a confirmation when job-fit score is below 50"
```

---

### Task 2: Confirmation card UI

**Files:**
- Modify: `src/pages/JDMatcherPage.tsx` (render section, ~line 504-538 before Task 1's edits shift line numbers — locate by the `{isGeneratingResume ? (` conditional and the `'Is this job right for you?'` step label, both unique strings in this file)

**Interfaces:**
- Consumes: `pendingLowFitConfirm`, `handleContinueLowFit`, `handleCancelLowFit` from Task 1.

- [ ] **Step 1: Replace the CTA + Step Progress block**

Find the block in `src/pages/JDMatcherPage.tsx` that starts with the comment `{/* CTA + Step Progress */}` and reads `{isGeneratingResume ? (`. Replace it with a three-way branch — confirm card first, then the existing step-progress card, then the existing button:

```tsx
              {/* CTA + Step Progress */}
              {pendingLowFitConfirm ? (
                <div className="rounded-xl border bg-card p-5 space-y-4 text-center">
                  <p className="text-sm font-semibold">
                    This job scored {pendingLowFitConfirm.score}/100 ({pendingLowFitConfirm.label}) — not a great match.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Do you want to continue with ATS analysis and tailoring anyway?
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={handleCancelLowFit}>Cancel</Button>
                    <Button onClick={handleContinueLowFit}>Continue Anyway</Button>
                  </div>
                </div>
              ) : isGeneratingResume ? (
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <p className="text-sm font-semibold text-center">Generating your tailored resume…</p>
                  <div className="space-y-3">
                    {([
                      { step: 1, label: 'Is this job right for you?', detail: stepResults.jobFit ? `${stepResults.jobFit.label} · ${stepResults.jobFit.score}/100` : null },
                      { step: 2, label: 'Keyword & ATS analysis', detail: stepResults.keywords ? `${stepResults.keywords.matched} matched · ${stepResults.keywords.missing} missing` : null },
                      { step: 3, label: 'Generating tailored LaTeX resume', detail: null },
                      { step: 4, label: 'Compiling PDF', detail: null },
                    ] as const).map(({ step, label, detail }) => {
                      const isDone = generationStep > step;
                      const isActive = generationStep === step;
                      return (
                        <div key={step} className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${
                          isDone ? 'bg-green-50 dark:bg-green-900/20' :
                          isActive ? 'bg-primary/10 border border-primary/25' :
                          'opacity-40'
                        }`}>
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDone ? 'bg-green-500 text-white' :
                            isActive ? 'bg-primary text-primary-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {isDone ? '✓' : step}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>{label}</p>
                            {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                          </div>
                          {isActive && <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Button className="w-full" onClick={handleGenerateTailored}>
                  <FileText className="h-4 w-4 mr-2" /> Generate Tailored Resume as PDF
                </Button>
              )}
```

(Only the outermost conditional changed — from `isGeneratingResume ? (...) : (...)` to `pendingLowFitConfirm ? (...) : isGeneratingResume ? (...) : (...)`. The step-progress card and button branches are copied unchanged from the existing code.)

- [ ] **Step 2: Type-check**

```bash
npx tsc -b
```
Expected: no errors.

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```
Repeat Task 1 Step 7's scenario 2 (a job description likely to score below 50) and confirm:
- The confirm card renders with the correct score/label and both buttons.
- "Cancel" returns to the plain "Generate Tailored Resume as PDF" button — clicking it again starts a fresh run (re-runs Step 1, since the previous fit result wasn't kept for a cancelled run — this is intended, not a bug).
- "Continue Anyway" resumes at Step 2 (verify via React DevTools or by watching the step-progress card jump straight to step 2 as active, skipping a re-run of step 1's loading state) and completes through to the PDF preview.
- A job description scoring ≥ 50 never shows the confirm card.

- [ ] **Step 4: Commit**

```bash
git add src/pages/JDMatcherPage.tsx
git commit -m "feat: show confirmation card when tailoring pipeline pauses for a low fit score"
```

---

### Task 3: Documentation update

**Files:**
- Modify: `docs/web/jd-matcher.md`

- [ ] **Step 1: Add a section describing the tailoring pipeline and the gate**

Append to `docs/web/jd-matcher.md` (after the existing "Tips" section):

```markdown

## Generate a Tailored Resume

Beyond the match score, you can generate a fully tailored resume as a PDF:

1. Run the match (above) first.
2. Click **Generate Tailored Resume as PDF**.
3. The app checks whether the job is a good fit for you before doing anything else.
4. If the job scores below 50 on that fit check, you'll be asked to confirm — *"not a great match, continue with ATS analysis and tailoring anyway?"* — before the app spends tokens on the rest of the pipeline (keyword/ATS analysis, LaTeX generation, PDF compile). Choose **Continue Anyway** to proceed, or **Cancel** to stop there.
5. A score of 50 or higher continues automatically with no prompt.
```

- [ ] **Step 2: Commit**

```bash
git add docs/web/jd-matcher.md
git commit -m "docs: document the tailored-resume pipeline and its job-fit gate"
```
