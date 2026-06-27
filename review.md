# Resumeow-AI Codebase Review

**Date:** 2026-06-27  
**Branch:** prod-2026  
**Reviewer:** Senior Code Reviewer

---

## Executive Summary

The codebase is a **React/TypeScript web application** for AI-powered resume generation with Firebase backend. Recent commits (prod-2026 branch) introduced significant features: onboarding wizard with resume parsing, profile completion gating for AI features, token-based access control, and "Lazy Mode" automated pipeline. While the feature set is impressive, there are **critical architectural issues**, **code duplication**, and **process flow problems** that need addressing.

---

## 🔴 Critical Issues (Must Fix)

### 1. App.tsx is a 835-line God Component
**File:** `src/App.tsx` (lines 1-835)

**Problems:**
- **50+ useState hooks** - violates single responsibility principle
- **25+ useEffect hooks** - complex side effect management with potential race conditions
- Business logic mixed with UI rendering
- Handles: onboarding, templates, prompts, ATS analysis, LaTeX generation, application tracking, fast compile mode, settings, template management - all in one component

**Impact:** Impossible to test, debug, or maintain. Any change risks breaking unrelated features.

**Recommendation:** Split into focused components:
- `useOnboardingState` hook for onboarding wizard state
- `useTemplateManager` hook for template CRUD
- `useATSAnalysis` hook for ATS scoring/suggestions
- `usePromptGenerator` hook (already exists but underutilized)
- `useFastCompile` hook for fast compile mode logic
- `ResumeBuilder` parent component composing these hooks

---

### 2. Duplicate Data Persistence Logic
**Files:** 
- `src/lib/dataIntegrity.ts` (lines 129-156) - `createDataBackup`, `restoreDataFromBackup`
- `src/lib/dataRecovery.ts` (lines 17-184) - `createEmergencyBackup`, `restoreFromBackup`, `autoRecoverLostData`

**Analysis:** Both files implement nearly identical backup/restore functionality with different localStorage key strategies:
- `dataIntegrity.ts`: Generic backup with `backupTimestamp` + version
- `dataRecovery.ts`: Emergency backup with `emergency_backup_{userId}_{timestamp}`

**Recommendation:** Merge into single `dataBackup.ts` module with configurable strategy (emergency vs. versioned). Remove dead code.

---

### 3. Duplicate Logging Infrastructure
**Files:**
- `src/lib/dataPersistenceLogger.ts` (280 lines) - Full-featured logger with session tracking, critical log persistence
- `src/hooks/useTemplates.ts` imports from logger and uses `logFirebaseOperation`, `logLocalStorageOperation`, `logDataIntegrityIssue`, `logBackupOperation`

**Problem:** The logger is over-engineered for current needs (no log export UI, no admin dashboard). The singleton pattern creates hidden dependencies.

**Recommendation:** Replace with lightweight structured logging using `console` with consistent prefixes, or integrate with existing error tracking (Sentry). Remove if not actively used for debugging.

---

### 4. Token System Split Across Two Contexts
**Files:**
- `src/lib/aiProviderContext.tsx` (lines 333-353) - `checkAndDeductTokens`, `assertTokenBalance`
- `src/lib/tokenContext.tsx` - `deductTokens`, `refetch`

**Conflict:** Both implement token deduction with different logic:
- `aiProviderContext`: Uses `fbDeductTokens` directly, checks balance before AI calls
- `tokenContext`: Uses same `fbDeductTokens` but maintains local profile state

**Risk:** Double-deduction possible if both called; inconsistent balance display.

**Recommendation:** Single source of truth - move all token logic to `tokenContext`, have `aiProviderContext` consume it via `useTokens()`.

---

### 5. OnboardingWizard.tsx - 1,614 Lines with All Steps Inline
**File:** `src/components/OnboardingWizard.tsx`

**Problems:**
- All 11 steps defined as inline components in one file
- `defaultProfile()` factory duplicated in lines 47-68 and used in `ResumeGeneratorPage.tsx`
- `StepNav` component duplicated in `OnboardingWizard` and could be shared
- Complex step navigation logic mixed with UI

**Recommendation:** 
- Extract each step to separate file: `steps/PersonalInfoStep.tsx`, `steps/ExperienceStep.tsx`, etc.
- Create `useOnboardingWizard` hook for navigation state
- Move `defaultProfile` to shared `lib/onboardingDefaults.ts`

---

## 🟠 Important Issues (Should Fix)

### 6. ATS Analysis Logic Duplicated
**Files:**
- `src/hooks/useAIService.ts` lines 259-380: `performCombinedATSAnalysis` (323 lines of prompt construction)
- `src/components/CombinedATSAnalysis.tsx` lines 118-142: **Identical** suggestion injection logic (key skills suggestion)

**Code duplication example:**
```typescript
// useAIService.ts lines 343-366
const hasKeySkillsSuggestion = suggestionsWithSelection.some((s: ATSSuggestion) => 
  s.suggestion.toLowerCase().includes('key skills') || ...
);

// CombinedATSAnalysis.tsx lines 119-142
const hasKeySkillsSuggestion = suggestionsWithSelection.some((s: ATSSuggestion) => 
  s.suggestion.toLowerCase().includes('key skills') || ...
);
```

**Recommendation:** Move shared logic to `lib/atsAnalysisUtils.ts`:
- `ensureKeySkillsSuggestion(suggestions, jobDescription)` 
- `extractSkillKeywords(jobDescription)`

---

### 7. LaTeX Cleaning Logic Duplicated in 3 Places
**Files:**
- `src/components/ResumeLaTeXGenerator.tsx` lines 73-94, 101-112, 120-127, 149-154
- `src/hooks/useAIService.ts` lines 161-164, 188-192

**Pattern repeated 6+ times:**
```typescript
let cleanedLatex = response;
cleanedLatex = cleanedLatex.replace(/^```(?:latex)?/m, '');
cleanedLatex = cleanedLatex.replace(/```$/m, '');
cleanedLatex = cleanedLatex.trim();
```

**Recommendation:** Create `lib/latexUtils.ts` with `cleanLatexResponse(response: string): string`

---

### 8. Multiple Firebase Initialization Patterns
**Files:**
- `src/lib/firebaseWeb.ts` lines 31-40: Firebase init with `browserLocalPersistence`
- Multiple files import `auth, db` directly from this module

**Problem:** No centralized Firebase configuration. If config changes, must update multiple files.

**Recommendation:** Create `lib/firebase/client.ts` exporting configured instances with proper typing.

---

### 9. Inconsistent Error Handling Patterns
**Examples:**
- `useAIService.ts` lines 82-93: `handleAIError` with toast notifications
- `useAIService.ts` lines 96-108: `makeAICallWithRetry` with duplicate error handling
- `aiProviderContext.tsx` lines 356-397: `makeAICall` with inline try/catch
- `firebaseWeb.ts` lines 97-104: `saveUserData` throws, callers catch
- `firebaseWeb.ts` lines 113-126: `getUserData` throws, callers catch

**Recommendation:** Standardize on `Result<T, E>` pattern or centralized `handleAsyncError` utility.

---

### 10. Profile Gate Logic Spread Across 3 Files
**Files:**
- `src/lib/profileCompletion.ts` - `checkProfileCompletion` (pure function)
- `src/hooks/useProfileGate.ts` - `useProfileGate` hook (fetches profile, checks completion)
- `src/components/ProfileGateBanner.tsx` - UI banner component

**Issue:** `useProfileGate` duplicates profile fetching logic that exists in `onboardingContext` and `ResumeGeneratorPage`.

**Recommendation:** Single `useResumeProfile` hook that provides profile + completion status, used everywhere.

---

## 🟡 Suggestions (Nice to Have)

### 11. Extract Custom Hooks from App.tsx
| Logic Block | Lines | Suggested Hook |
|-------------|-------|----------------|
| Template selection + localStorage sync | 96-157 | `useSelectedTemplate` |
| Active prompts + localStorage sync | 109-157 | `useActivePrompts` |
| Fast compile mode state | 89-94, 237-240, 552-595 | `useFastCompile` |
| ATS suggestions/keywords sync | 165-202, 228-230 | `useATSInstructions` |
| Clear all data logic | 442-481 | `useClearAllData` |

### 12. LazyMode Pipeline - Tight Coupling
**File:** `src/lib/lazyModePipeline.ts` (856 lines)

- Pipeline steps hardcoded in `LAZY_MODE_STEPS` array
- Each step imports `makeAICall` directly from context
- No way to inject mock for testing

**Recommendation:** Dependency injection pattern:
```typescript
interface LazyModeStep {
  name: string;
  execute: (input: any, ai: { call: (prompt: string) => Promise<string> }) => Promise<any>;
}
```

### 13. TypeScript `any` Usage in AI Calls
**File:** `src/lib/aiProviderContext.tsx` line 506:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const completion = await (client.chat.completions.create as any)({
  extra_body: { thinking: { type: 'enabled' } },
});
```

**Recommendation:** Proper type augmentation or wrapper function.

### 14. Missing Test Coverage
Only 1 test file: `src/lib/__tests__/profileSeeding.test.ts`

**Critical untested areas:**
- `useTemplates` - complex Firebase/localStorage sync
- `aiProviderContext` - token deduction, fallback logic
- `onboardingContext` - auth state transitions
- `CombinedATSAnalysis` - auto-analysis triggers

### 15. Component Props Drilling
`App.tsx` passes 20+ props to `SettingsDialog` and `TemplateManagementDialog`:
```typescript
<SettingsDialog
  isOpen={isSettingsOpen}
  onClose={() => setIsSettingsOpen(false)}
  customPrompts={customPrompts}
  resumeTemplates={resumeTemplates}
  coverLetterTemplates={coverLetterTemplates}
  activePrompts={activePrompts}
  onAddCustomPrompt={handleAddCustomPrompt}
  onUpdateCustomPrompt={handleUpdateCustomPrompt}
  onDeleteCustomPrompt={handleDeleteCustomPrompt}
  onSetActivePrompt={handleSetActivePrompt}
  clearAllData={clearAllData}
/>
```

**Recommendation:** Use context for dialog state or compound components pattern.

---

## 📊 Process Flow Issues

### 16. Onboarding → Resume Generation Flow Broken
**Current flow:**
1. User completes onboarding → `onboardingContext.completeOnboarding()` saves `onboarding: { completed: true }`
2. Redirects to `/resume` → `ResumeGeneratorPage` loads `resumeProfile` from Firebase
3. But `resumeProfile` is saved in `OnboardingWizard.handleGenerate()` **before** `completeOnboarding()`

**Problem:** If user closes browser between handleGenerate and completeOnboarding, profile exists but onboarding marked incomplete.

**Fix:** Transactional save - write profile + onboarding completion atomically, or use `onboarding` doc as source of truth.

---

### 17. Token Deduction Race Condition
**Flow:** 
1. `makeAICall` calls `assertTokenBalance()` → reads profile
2. AI call executes  
3. `checkAndDeductTokens()` calls `fbDeductTokens()` → writes profile

**Race:** Two simultaneous AI calls both pass balance check, both deduct → negative balance possible.

**Fix:** Use Firestore transaction in `fbDeductTokens` (already does `increment`), but balance check must be in same transaction.

---

### 18. Fast Compile Mode - Confusing State Machine
**States in App.tsx:**
- `fastCompile` (user toggle)
- `fastCompileATS` (settings toggle)  
- `fastAtsComplete` (analysis done)
- `isCompiling` (generation in progress)
- `generatedPrompt` (has prompt)

**Disable logic (lines 724-734):**
```typescript
disabled={
  fastCompile && promptType === 'resume' ?
    (isCompiling || (fastCompileATS && !fastAtsComplete)) :
    (!activePrompts[promptType] || ...)
}
```

**Problem:** 5 boolean states with complex interdependencies. Hard to reason about.

**Recommendation:** Explicit state machine:
```typescript
type FastCompileState = 
  | 'idle' 
  | 'awaitingJD' 
  | 'analyzingATS' 
  | 'readyToCompile' 
  | 'compiling' 
  | 'complete';
```

---

## 📁 File Structure Recommendations

### Current (flat):
```
src/
├── components/ (40+ files)
├── hooks/ (6 files)
├── lib/ (20+ files)
├── pages/ (5 files)
└── types/
```

### Suggested (feature-based):
```
src/
├── features/
│   ├── onboarding/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── steps/
│   │   └── types.ts
│   ├── templates/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── ats-analysis/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils.ts
│   ├── resume-generation/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils.ts
│   ├── lazy-mode/
│   │   ├── pipeline/
│   │   ├── components/
│   │   └── hooks/
│   └── auth/
│       ├── context/
│       └── hooks/
├── shared/
│   ├── components/ui/
│   ├── hooks/
│   ├── lib/
│   │   ├── firebase/
│   │   ├── latex/
│   │   └── logging/
│   └── types/
└── app/
    ├── App.tsx (thin router)
    └── providers/
```

---

## 🎯 Priority Action Items

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Split App.tsx into 5+ focused hooks/components | High | Critical - unblocks all other work |
| **P0** | Merge dataIntegrity.ts + dataRecovery.ts | Low | Eliminates duplicate backup logic |
| **P0** | Unify token deduction into single context | Medium | Prevents double-deduction bugs |
| **P1** | Extract ATS suggestion logic to shared util | Low | Removes 100+ lines duplicate code |
| **P1** | Extract LaTeX cleaning to shared util | Low | Removes 6+ duplicate code blocks |
| **P1** | Break OnboardingWizard into step components | Medium | Enables testing, easier maintenance |
| **P2** | Add integration tests for useTemplates + auth flow | High | Prevents data loss regressions |
| **P2** | Implement FastCompile state machine | Medium | Eliminates complex boolean logic |
| **P3** | Migrate to feature-based folder structure | High | Long-term maintainability |

---

## Summary

The codebase demonstrates **strong feature velocity** but has accumulated **significant technical debt** from rapid iteration. The most impactful fix is decomposing `App.tsx` - it's the architectural root cause of many other issues (prop drilling, duplicate state, untestable logic). The duplicate backup/logging systems and split token contexts are close seconds for immediate attention.

The recent onboarding + profile completion features are well-designed conceptually but need architectural cleanup to be maintainable long-term.