# Tech Debt Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical and important issues identified in `review.md`: eliminate code duplication, unify token system, decompose god components, fix process flow bugs.

**Architecture:** Work in priority tiers — zero-risk utility extractions first, then bug fixes (token unification), then architectural refactors (App.tsx hooks, OnboardingWizard steps). Each task is independently deployable and testable.

**Tech Stack:** React 18, TypeScript, Firebase/Firestore, Vite, Jest, Sonner (toasts), shadcn/ui

## Global Constraints

- Never introduce new behavior, only refactor existing behavior into better structure
- TypeScript strict — no `any` in new code
- Each task must leave the app in a working, buildable state
- Run `npm run build` after each task to verify no regressions
- Test file path: `src/lib/__tests__/`

---

## Task 1: Extract `cleanLatexResponse` Utility

**Files:**
- Create: `src/lib/latexUtils.ts`
- Modify: `src/components/ResumeLaTeXGenerator.tsx` (lines 73-94, 101-112, 120-127, 149-154)
- Modify: `src/hooks/useAIService.ts` (lines 161-164, 188-192)

**Interfaces:**
- Produces: `cleanLatexResponse(raw: string): string` — strips markdown fences, trims

- [ ] **Step 1: Create `src/lib/latexUtils.ts`**

```typescript
export function cleanLatexResponse(raw: string): string {
  return raw
    .replace(/^```(?:latex)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();
}
```

- [ ] **Step 2: Write the test**

Create `src/lib/__tests__/latexUtils.test.ts`:

```typescript
import { cleanLatexResponse } from '../latexUtils';

describe('cleanLatexResponse', () => {
  it('strips ```latex fence', () => {
    const input = '```latex\n\\documentclass{article}\n```';
    expect(cleanLatexResponse(input)).toBe('\\documentclass{article}');
  });

  it('strips plain ``` fence', () => {
    const input = '```\n\\documentclass{article}\n```';
    expect(cleanLatexResponse(input)).toBe('\\documentclass{article}');
  });

  it('returns untouched string with no fence', () => {
    const input = '\\documentclass{article}';
    expect(cleanLatexResponse(input)).toBe('\\documentclass{article}');
  });

  it('trims leading/trailing whitespace', () => {
    expect(cleanLatexResponse('  hello  ')).toBe('hello');
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

```
npm test -- --testPathPattern=latexUtils
```

Expected: PASS (4 tests)

- [ ] **Step 4: Replace all inline cleaning in `ResumeLaTeXGenerator.tsx`**

In `src/components/ResumeLaTeXGenerator.tsx`, add import at top:
```typescript
import { cleanLatexResponse } from '@/lib/latexUtils';
```

Then replace every block matching this pattern:
```typescript
let cleanedLatex = generatedLatex;
cleanedLatex = cleanedLatex.replace(/^```(?:latex)?/m, '');
cleanedLatex = cleanedLatex.replace(/```$/m, '');
cleanedLatex = cleanedLatex.trim();
```
with:
```typescript
const cleanedLatex = cleanLatexResponse(generatedLatex);
```

There are 4 such occurrences in this file (copyToClipboard, openEditDialog, downloadAsTex, openInOverleaf). Each stores result in a local `cleanedLatex` variable — they can remain as `const cleanedLatex`.

- [ ] **Step 5: Replace inline cleaning in `useAIService.ts`**

In `src/hooks/useAIService.ts`, add import:
```typescript
import { cleanLatexResponse } from '@/lib/latexUtils';
```

Replace lines 160-164 (inside `generateLatexResume`):
```typescript
// Before:
let cleanedLatex = response;
cleanedLatex = cleanedLatex.replace(/^```(?:latex)?/m, '');
cleanedLatex = cleanedLatex.replace(/```$/m, '');
cleanedLatex = cleanedLatex.trim();
// After:
const cleanedLatex = cleanLatexResponse(response);
```

Replace lines 188-193 (inside `generateCoverLetter`):
```typescript
// Before:
let cleanedContent = response;
if (isLatex) {
  cleanedContent = cleanedContent.replace(/^```(?:latex)?/m, '');
  cleanedContent = cleanedContent.replace(/```$/m, '');
}
cleanedContent = cleanedContent.trim();
// After:
const cleanedContent = isLatex ? cleanLatexResponse(response) : response.trim();
```

- [ ] **Step 6: Build check**

```
npm run build
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/latexUtils.ts src/lib/__tests__/latexUtils.test.ts src/components/ResumeLaTeXGenerator.tsx src/hooks/useAIService.ts
git commit -m "refactor: extract cleanLatexResponse utility, remove 6x duplication"
```

---

## Task 2: Extract ATS Key-Skills Logic to Shared Util

**Files:**
- Create: `src/lib/atsAnalysisUtils.ts`
- Modify: `src/hooks/useAIService.ts` (lines 340-367)
- Modify: `src/components/CombinedATSAnalysis.tsx` (lines 118-143)

**Interfaces:**
- Consumes: `ATSSuggestion` from `src/hooks/useAIService.ts`
- Produces: `ensureKeySkillsSuggestion(suggestions: ATSSuggestion[], jobDescription: string): ATSSuggestion[]`

- [ ] **Step 1: Create `src/lib/atsAnalysisUtils.ts`**

```typescript
import type { ATSSuggestion } from '@/hooks/useAIService';

const SKILL_PATTERN = /\b(?:python|javascript|react|node\.js|sql|aws|docker|kubernetes|git|agile|scrum|java|c\+\+|html|css|machine learning|data analysis|project management|leadership|communication|teamwork|problem solving|analytical|technical|programming|development|software|database|cloud|api|framework|library|testing|debugging|optimization)\b/gi;

function hasKeySkillsSuggestion(suggestions: ATSSuggestion[]): boolean {
  return suggestions.some(s =>
    s.suggestion.toLowerCase().includes('key skills') ||
    s.suggestion.toLowerCase().includes('essential skills') ||
    (s.suggestion.toLowerCase().includes('incorporate') && s.suggestion.toLowerCase().includes('skills')) ||
    (s.category.toLowerCase() === 'skills & technologies' && s.suggestion.toLowerCase().includes('add'))
  );
}

export function ensureKeySkillsSuggestion(
  suggestions: ATSSuggestion[],
  jobDescription: string
): ATSSuggestion[] {
  if (hasKeySkillsSuggestion(suggestions)) return suggestions;

  const skillKeywords = jobDescription.toLowerCase().match(SKILL_PATTERN) ?? [];
  const uniqueSkills = [...new Set(skillKeywords)].slice(0, 5);
  const skillsText = uniqueSkills.length > 0
    ? `key skills (such as ${uniqueSkills.join(', ')}) `
    : 'key skills ';

  const keySkillsSuggestion: ATSSuggestion = {
    id: 'key-skills-natural',
    category: 'Skills & Technologies',
    suggestion: `Add all ${skillsText}from the job description naturally throughout your resume, particularly in the skills section, experience descriptions, and summary to improve keyword matching and ATS compatibility.`,
    impact: 'high',
    selected: true,
  };

  return [keySkillsSuggestion, ...suggestions];
}
```

- [ ] **Step 2: Write the test**

Create `src/lib/__tests__/atsAnalysisUtils.test.ts`:

```typescript
import { ensureKeySkillsSuggestion } from '../atsAnalysisUtils';
import type { ATSSuggestion } from '@/hooks/useAIService';

const makeSuggestion = (overrides: Partial<ATSSuggestion> = {}): ATSSuggestion => ({
  id: 'test',
  category: 'General',
  suggestion: 'Some suggestion',
  impact: 'low',
  selected: true,
  ...overrides,
});

describe('ensureKeySkillsSuggestion', () => {
  it('prepends key-skills suggestion when none exists', () => {
    const result = ensureKeySkillsSuggestion([makeSuggestion()], 'We need Python and React developers');
    expect(result[0].id).toBe('key-skills-natural');
    expect(result[0].suggestion).toContain('python');
  });

  it('does not add duplicate when key skills suggestion already present', () => {
    const existing = makeSuggestion({ suggestion: 'Add key skills to your resume' });
    const result = ensureKeySkillsSuggestion([existing], 'some job description');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('test');
  });

  it('handles job description with no matching skills', () => {
    const result = ensureKeySkillsSuggestion([], 'We want a great person');
    expect(result[0].suggestion).toContain('key skills ');
    expect(result[0].suggestion).not.toContain('such as');
  });
});
```

- [ ] **Step 3: Run test**

```
npm test -- --testPathPattern=atsAnalysisUtils
```

Expected: PASS (3 tests)

- [ ] **Step 4: Update `useAIService.ts`**

Add import at top of `src/hooks/useAIService.ts`:
```typescript
import { ensureKeySkillsSuggestion } from '@/lib/atsAnalysisUtils';
```

In `performCombinedATSAnalysis` (around line 330), replace the block:
```typescript
// Always ensure there's a suggestion about adding key skills naturally
const hasKeySkillsSuggestion = suggestionsWithSelection.some((s: ATSSuggestion) => 
  s.suggestion.toLowerCase().includes('key skills') || 
  ...
);
if (!hasKeySkillsSuggestion) {
  // ... 20 lines building and prepending keySkillsSuggestion
  suggestionsWithSelection = [keySkillsSuggestion, ...suggestionsWithSelection];
}
```
with:
```typescript
suggestionsWithSelection = ensureKeySkillsSuggestion(suggestionsWithSelection, jobDescription);
```

- [ ] **Step 5: Update `CombinedATSAnalysis.tsx`**

Add import at top of `src/components/CombinedATSAnalysis.tsx`:
```typescript
import { ensureKeySkillsSuggestion } from '@/lib/atsAnalysisUtils';
```

In the analysis callback (around line 118), replace the identical block with:
```typescript
suggestionsWithSelection = ensureKeySkillsSuggestion(suggestionsWithSelection, jobDescription);
```

- [ ] **Step 6: Build check**

```
npm run build
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/atsAnalysisUtils.ts src/lib/__tests__/atsAnalysisUtils.test.ts src/hooks/useAIService.ts src/components/CombinedATSAnalysis.tsx
git commit -m "refactor: extract ensureKeySkillsSuggestion, eliminate ATS logic duplication"
```

---

## Task 3: Consolidate Backup Logic — Delete `dataRecovery.ts`

The two backup systems serve different purposes:
- `dataIntegrity.ts`: Has `createDataBackup` (generic JSON blob) — this is vestigial/unused
- `dataRecovery.ts`: Has the real per-user localStorage backup with user-scoped keys

`useTemplates.ts` only imports from `dataRecovery.ts` for actual backup operations. `createDataBackup` from `dataIntegrity.ts` is not used by any consumer (confirmed by grep). Plan: delete `dataRecovery.ts` by moving its exports into `dataIntegrity.ts`, then update imports.

**Files:**
- Modify: `src/lib/dataIntegrity.ts` — add all exports from `dataRecovery.ts`, remove unused `createDataBackup`/`restoreDataFromBackup`
- Delete: `src/lib/dataRecovery.ts`
- Modify: `src/hooks/useTemplates.ts` — update import to single file

- [ ] **Step 1: Verify `createDataBackup` is unused**

```bash
grep -r "createDataBackup\|restoreDataFromBackup" src/ --include="*.ts" --include="*.tsx"
```

Expected: only appears in `src/lib/dataIntegrity.ts` itself (no consumers). If any consumers exist, keep the functions and skip removing them.

- [ ] **Step 2: Append `dataRecovery.ts` contents to `dataIntegrity.ts`**

Open `src/lib/dataIntegrity.ts`. Remove the two vestigial functions `createDataBackup` and `restoreDataFromBackup` (lines 129-156) if Step 1 confirmed no consumers. Then append all exports from `dataRecovery.ts` (everything below the imports block) to the bottom of `dataIntegrity.ts`:

```typescript
// --- Backup/Recovery (consolidated from dataRecovery.ts) ---

interface BackupData {
  resumeTemplates: Template[];
  coverLetterTemplates: Template[];
  customPrompts: CustomPrompt[];
  userSettings: Record<string, unknown>;
  timestamp: string;
  userId: string;
}

const BACKUP_KEY_PREFIX = 'emergency_backup_';
const MAX_BACKUPS = 5;

export const createEmergencyBackup = (
  userId: string,
  data: {
    resumeTemplates: Template[];
    coverLetterTemplates: Template[];
    customPrompts: CustomPrompt[];
    userSettings?: Record<string, unknown>;
  }
): void => {
  try {
    const backup: BackupData = {
      ...data,
      userSettings: data.userSettings ?? {},
      timestamp: new Date().toISOString(),
      userId,
    };
    const backupKey = `${BACKUP_KEY_PREFIX}${userId}_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(backup));
    cleanupOldBackups(userId);
  } catch (error) {
    console.error('[backup] Failed to create emergency backup:', error);
  }
};

export const getAvailableBackups = (userId: string): BackupData[] => {
  const backups: BackupData[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${BACKUP_KEY_PREFIX}${userId}_`)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try { backups.push(JSON.parse(raw) as BackupData); } catch { /* skip corrupt */ }
        }
      }
    }
  } catch (error) {
    console.error('[backup] Error reading backups:', error);
  }
  return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const restoreFromBackup = (backup: BackupData): boolean => {
  try {
    const userKey = `user_${backup.userId}`;
    if (backup.resumeTemplates.length > 0) {
      localStorage.setItem(`${userKey}_resumeTemplates`, JSON.stringify(backup.resumeTemplates));
    }
    if (backup.coverLetterTemplates.length > 0) {
      localStorage.setItem(`${userKey}_coverLetterTemplates`, JSON.stringify(backup.coverLetterTemplates));
    }
    if (backup.customPrompts.length > 0) {
      localStorage.setItem(`${userKey}_customPrompts`, JSON.stringify(backup.customPrompts));
    }
    if (Object.keys(backup.userSettings).length > 0) {
      Object.entries(backup.userSettings).forEach(([key, value]) => {
        if (typeof value === 'string') localStorage.setItem(`${userKey}_${key}`, value);
      });
    }
    toast.success(`Data restored from backup (${new Date(backup.timestamp).toLocaleString()})`);
    return true;
  } catch (error) {
    console.error('[backup] Error restoring:', error);
    toast.error('Failed to restore backup');
    return false;
  }
};

export const autoRecoverLostData = (userId: string): boolean => {
  const backups = getAvailableBackups(userId);
  if (backups.length === 0) return false;
  const success = restoreFromBackup(backups[0]);
  if (success) toast.info('Data automatically recovered from backup');
  return success;
};

export const cleanupOldBackups = (userId: string): void => {
  try {
    const backups = getAvailableBackups(userId);
    if (backups.length > MAX_BACKUPS) {
      backups.slice(MAX_BACKUPS).forEach(backup => {
        const key = `${BACKUP_KEY_PREFIX}${userId}_${new Date(backup.timestamp).getTime()}`;
        localStorage.removeItem(key);
      });
    }
  } catch (error) {
    console.error('[backup] Error during cleanup:', error);
  }
};

export const checkDataConsistency = (userId: string): {
  hasData: boolean;
  hasBackups: boolean;
  dataCount: number;
  backupCount: number;
} => {
  const userKey = `user_${userId}`;
  const keys = ['resumeTemplates', 'coverLetterTemplates', 'customPrompts'];
  const dataCount = keys.filter(k => localStorage.getItem(`${userKey}_${k}`) !== null).length;
  const backups = getAvailableBackups(userId);
  return { hasData: dataCount > 0, hasBackups: backups.length > 0, dataCount, backupCount: backups.length };
};
```

- [ ] **Step 3: Update `useTemplates.ts` import**

In `src/hooks/useTemplates.ts`, change:
```typescript
import { createEmergencyBackup, autoRecoverLostData, checkDataConsistency, getAvailableBackups, restoreFromBackup } from "@/lib/dataRecovery";
```
to:
```typescript
import { createEmergencyBackup, autoRecoverLostData, checkDataConsistency, getAvailableBackups, restoreFromBackup } from "@/lib/dataIntegrity";
```

- [ ] **Step 4: Delete `dataRecovery.ts`**

```bash
rm src/lib/dataRecovery.ts
```

- [ ] **Step 5: Build check**

```
npm run build
```

Expected: no errors. If TypeScript complains about missing imports, the grep in Step 1 missed a consumer — fix that import.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dataIntegrity.ts src/hooks/useTemplates.ts
git rm src/lib/dataRecovery.ts
git commit -m "refactor: consolidate backup logic into dataIntegrity.ts, delete dataRecovery.ts"
```

---

## Task 4: Replace `dataPersistenceLogger.ts` with Console Calls

The 280-line logger has no admin UI, no export mechanism, and creates hidden singleton dependencies. Replace all calls with `console` + structured prefixes.

**Files:**
- Modify: `src/hooks/useTemplates.ts` — replace logger calls with console
- Modify: `src/components/DebuggingDashboard.tsx` — remove logger dependency
- Delete: `src/lib/dataPersistenceLogger.ts`

- [ ] **Step 1: Audit what logger calls appear in `useTemplates.ts`**

```bash
grep -n "log\(Firebase\|logLocal\|logData\|logBackup\)" src/hooks/useTemplates.ts
```

Note each call site's message/context. You will replace each with an equivalent `console` call.

- [ ] **Step 2: Update `useTemplates.ts`**

Remove the import block:
```typescript
import {
  logFirebaseOperation, 
  logLocalStorageOperation, 
  logDataIntegrityIssue, 
  logBackupOperation,
} from "@/lib/dataPersistenceLogger";
```

Replace all logger calls with console equivalents:

| Old call | New call |
|---|---|
| `logLocalStorageOperation('save', true, uid, 'resumeTemplates')` | `console.debug('[localStorage] save resumeTemplates ok', uid)` |
| `logLocalStorageOperation('save', false, uid, 'templates', error)` | `console.error('[localStorage] save templates failed', { uid, error })` |
| `logFirebaseOperation('save', true, uid, 'templates')` | `console.debug('[firebase] save templates ok', uid)` |
| `logFirebaseOperation('save', false, uid, 'templates', error, retryCount)` | `console.error('[firebase] save templates failed', { uid, error, retryCount })` |
| `logDataIntegrityIssue(uid, 'invalid_data', 'Data integrity..', report)` | `console.warn('[integrity] invalid_data', { uid, report })` |
| `logDataIntegrityIssue(uid, 'repair_failed', 'Resume templates invalid')` | `console.warn('[integrity] repair_failed resume templates', uid)` |
| `logDataIntegrityIssue(uid, 'repair_failed', 'Cover letter templates invalid')` | `console.warn('[integrity] repair_failed cover letter templates', uid)` |
| `logDataIntegrityIssue(uid, 'repair_failed', 'Custom prompts invalid')` | `console.warn('[integrity] repair_failed custom prompts', uid)` |
| `logBackupOperation('restore', false, uid, { reason: 'auto_recovery_attempt', consistency })` | `console.warn('[backup] restore attempt', { uid, consistency })` |
| `logBackupOperation('restore', true, uid, { reason: 'auto_recovery_success' })` | `console.debug('[backup] restore success', uid)` |
| `logBackupOperation('restore', false, uid, { reason: 'auto_recovery_failed' })` | `console.error('[backup] restore failed', uid)` |
| `logBackupOperation('create', true, uid, {...})` | `console.debug('[backup] create ok', uid)` |
| `logBackupOperation('create', false, uid, { error })` | `console.error('[backup] create failed', { uid, error })` |

- [ ] **Step 3: Audit `DebuggingDashboard.tsx`**

```bash
grep -n "dataPersistenceLogger\|logFirebase\|logLocal\|logData\|logBackup\|getLogs\|clearLogs\|getSessionLogs" src/components/DebuggingDashboard.tsx
```

The DebuggingDashboard likely reads logs from the logger singleton. Since no admin UI exists, replace log-reading with a static message or remove the dashboard functionality that depends on the logger. Keep any other dashboard features intact.

Replace any logger import and usages. If the dashboard only shows logs from the logger, replace the log display section with:

```tsx
<p className="text-muted-foreground text-sm">
  Debug logs are now written to the browser console.
</p>
```

- [ ] **Step 4: Delete `dataPersistenceLogger.ts`**

```bash
rm src/lib/dataPersistenceLogger.ts
```

- [ ] **Step 5: Build check**

```
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTemplates.ts src/components/DebuggingDashboard.tsx
git rm src/lib/dataPersistenceLogger.ts
git commit -m "refactor: replace over-engineered logger with console calls, delete dataPersistenceLogger"
```

---

## Task 5: Unify Token System — Fix Double-Deduction Bug

**Root cause:** `AIProviderProvider` wraps `TokenProvider` in `main.tsx`, so `aiProviderContext.tsx` can't call `useTokens()`. Fix: swap nesting order. Then route all token logic through `tokenContext.tsx`.

**Files:**
- Modify: `src/main.tsx` — swap `TokenProvider` outside `AIProviderProvider`
- Modify: `src/lib/tokenContext.tsx` — add `assertSufficientBalance()` to context
- Modify: `src/lib/aiProviderContext.tsx` — remove `checkAndDeductTokens`, `assertTokenBalance`; use `useTokens()` instead

**Interfaces:**
- `tokenContext.tsx` adds: `assertSufficientBalance(): Promise<void>` — throws `'INSUFFICIENT_TOKENS'` if balance ≤ 0

- [ ] **Step 1: Swap provider nesting in `main.tsx`**

In `src/main.tsx`, change:
```tsx
<AIProviderProvider>
  <TokenProvider>
    ...
  </TokenProvider>
</AIProviderProvider>
```
to:
```tsx
<TokenProvider>
  <AIProviderProvider>
    ...
  </AIProviderProvider>
</TokenProvider>
```

(Just move the `<TokenProvider>` and `</TokenProvider>` tags to be outside `AIProviderProvider`.)

- [ ] **Step 2: Add `assertSufficientBalance` to `tokenContext.tsx`**

In `src/lib/tokenContext.tsx`, update the interface:
```typescript
interface TokenContextType {
  profile: UserProfile | null;
  tokensRemaining: number;
  tokensUsed: number;
  tokensAllocated: number;
  isAdmin: boolean;
  isLoading: boolean;
  deductTokens: (chars: number) => Promise<boolean>;
  refetch: () => Promise<void>;
  assertSufficientBalance: () => Promise<void>;
}
```

Add the implementation inside `TokenProvider`, after the `deductTokens` callback:
```typescript
const assertSufficientBalance = useCallback(async (): Promise<void> => {
  if (!currentUser) return;
  // Refetch to get fresh balance (avoids stale local state under concurrent calls)
  const fresh = await getUserProfile(currentUser.uid).catch(() => null);
  if (fresh && !fresh.isAdmin && fresh.tokensRemaining <= 0) {
    throw new Error('INSUFFICIENT_TOKENS');
  }
}, [currentUser]);
```

Add `assertSufficientBalance` to the context value object and to the `TokenContext.Provider value` prop.

- [ ] **Step 3: Update `aiProviderContext.tsx`**

Add import at top of `src/lib/aiProviderContext.tsx`:
```typescript
import { useTokens } from './tokenContext';
```

Inside `AIProviderProvider` function body, add near the top:
```typescript
const { assertSufficientBalance, deductTokens } = useTokens();
```

Remove the two private functions `checkAndDeductTokens` (lines 333-337) and `assertTokenBalance` (lines 339-353).

Replace usages in `makeAICall`:

Old `assertTokenBalance()` call → `await assertSufficientBalance()`

Old `void checkAndDeductTokens(prompt.length, result.length)` calls → replace with:
```typescript
void deductTokens(prompt.length + result.length);
```

The `getUserProfile` import in `aiProviderContext.tsx` may no longer be needed for token checking — verify and remove if it was only used by `assertTokenBalance`.

- [ ] **Step 4: Build check**

```
npm run build
```

If TypeScript complains about `useTokens` being called outside a `TokenProvider`, the nesting in Step 1 was not done correctly — verify `main.tsx`.

- [ ] **Step 5: Manual smoke test**

Start the dev server (`npm run dev`). Log in, open a page that calls the AI. Verify:
1. Token balance displays correctly in the UI
2. Making an AI call deducts tokens (refresh to confirm)
3. No double-deduction (balance drops by expected amount, not double)

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx src/lib/tokenContext.tsx src/lib/aiProviderContext.tsx
git commit -m "fix: unify token system — route all deduction through TokenContext, fix double-deduction risk"
```

---

## Task 6: Extract Custom Hooks from App.tsx

`App.tsx` is 835 lines with 50+ useState hooks. Extract the self-contained state clusters into hooks to reduce complexity and enable testing. This task extracts 4 hooks; App.tsx will still be large but manageable.

**Files:**
- Create: `src/hooks/useSelectedTemplate.ts`
- Create: `src/hooks/useActivePrompts.ts`
- Create: `src/hooks/useFastCompile.ts`
- Create: `src/hooks/useATSInstructions.ts`
- Modify: `src/App.tsx` — replace inline state with hook calls

**Interfaces:**
- Each hook takes `currentUser: User | null` and returns its state + setters

- [ ] **Step 1: Create `src/hooks/useSelectedTemplate.ts`**

This hook owns `selectedTemplateId` and `selectedCoverLetterTemplateId` (lines 96-134 in App.tsx):

```typescript
import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';

export function useSelectedTemplate(currentUser: User | null) {
  const userKey = currentUser ? `user_${currentUser.uid}` : null;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    if (!userKey) return 'no-selection';
    const saved = localStorage.getItem(`${userKey}_selectedTemplateId`);
    return saved && saved !== '' ? saved : 'no-selection';
  });

  const [selectedCoverLetterTemplateId, setSelectedCoverLetterTemplateId] = useState<string>(() => {
    if (!userKey) return 'no-selection';
    const saved = localStorage.getItem(`${userKey}_selectedCoverLetterTemplateId`);
    return saved && saved !== '' ? saved : 'no-selection';
  });

  // Persist on change
  useEffect(() => {
    if (!userKey || selectedTemplateId === 'no-selection') return;
    localStorage.setItem(`${userKey}_selectedTemplateId`, selectedTemplateId);
  }, [userKey, selectedTemplateId]);

  useEffect(() => {
    if (!userKey || selectedCoverLetterTemplateId === 'no-selection') return;
    localStorage.setItem(`${userKey}_selectedCoverLetterTemplateId`, selectedCoverLetterTemplateId);
  }, [userKey, selectedCoverLetterTemplateId]);

  // Reset on user change
  useEffect(() => {
    if (currentUser) {
      const uk = `user_${currentUser.uid}`;
      const savedResume = localStorage.getItem(`${uk}_selectedTemplateId`);
      const savedCoverLetter = localStorage.getItem(`${uk}_selectedCoverLetterTemplateId`);
      setSelectedTemplateId(savedResume && savedResume !== '' ? savedResume : 'no-selection');
      setSelectedCoverLetterTemplateId(savedCoverLetter && savedCoverLetter !== '' ? savedCoverLetter : 'no-selection');
    } else {
      setSelectedTemplateId('no-selection');
      setSelectedCoverLetterTemplateId('no-selection');
    }
  }, [currentUser]);

  return {
    selectedTemplateId,
    setSelectedTemplateId,
    selectedCoverLetterTemplateId,
    setSelectedCoverLetterTemplateId,
  };
}
```

- [ ] **Step 2: Create `src/hooks/useActivePrompts.ts`**

This hook owns `activePrompts` state (lines 109-116 and 143-156 in App.tsx):

```typescript
import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { PromptType } from '@/types';

export function useActivePrompts(currentUser: User | null) {
  const [activePrompts, setActivePrompts] = useState<Record<PromptType, string>>(() => {
    if (!currentUser) return { resume: '', coverLetter: '' };
    const uk = `user_${currentUser.uid}`;
    return {
      resume: localStorage.getItem(`${uk}_activePrompt_resume`) ?? '',
      coverLetter: localStorage.getItem(`${uk}_activePrompt_coverLetter`) ?? '',
    };
  });

  useEffect(() => {
    if (currentUser) {
      const uk = `user_${currentUser.uid}`;
      setActivePrompts({
        resume: localStorage.getItem(`${uk}_activePrompt_resume`) ?? '',
        coverLetter: localStorage.getItem(`${uk}_activePrompt_coverLetter`) ?? '',
      });
    } else {
      setActivePrompts({ resume: '', coverLetter: '' });
    }
  }, [currentUser]);

  return { activePrompts, setActivePrompts };
}
```

- [ ] **Step 3: Create `src/hooks/useFastCompile.ts`**

This hook owns the fast compile boolean state cluster (lines 89-94, 232-240 in App.tsx):

```typescript
import { useState, useEffect } from 'react';

export type FastCompileState = 'idle' | 'awaitingJD' | 'analyzingATS' | 'readyToCompile' | 'compiling' | 'complete';

export function useFastCompile(jobDescription: string) {
  const [fastCompile, setFastCompile] = useState(false);
  const [fastCompileATS, setFastCompileATS] = useState<boolean>(() => {
    try { return localStorage.getItem('fastCompileATS') !== 'false'; } catch { return true; }
  });
  const [fastSettingsOpen, setFastSettingsOpen] = useState(false);
  const [fastAtsComplete, setFastAtsComplete] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  const handleToggleFastCompileATS = (value: boolean) => {
    setFastCompileATS(value);
    try { localStorage.setItem('fastCompileATS', String(value)); } catch { /* ignore */ }
  };

  // Re-require fresh job scan when JD changes
  useEffect(() => {
    setFastAtsComplete(false);
  }, [jobDescription]);

  return {
    fastCompile, setFastCompile,
    fastCompileATS, handleToggleFastCompileATS,
    fastSettingsOpen, setFastSettingsOpen,
    fastAtsComplete, setFastAtsComplete,
    isCompiling, setIsCompiling,
  };
}
```

- [ ] **Step 4: Create `src/hooks/useATSInstructions.ts`**

This hook owns the ATS suggestions → optional instructions sync (lines 165-202 in App.tsx):

```typescript
import { useState, useEffect } from 'react';

export function useATSInstructions() {
  const [atsSuggestions, setAtsSuggestions] = useState<string[]>([]);
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);
  const [hasOptionalInstructions, setHasOptionalInstructions] = useState(false);
  const [optionalInstructions, setOptionalInstructions] = useState('');

  useEffect(() => {
    const parts: string[] = [];
    if (missingKeywords.length > 0) {
      parts.push(`--- Missing Keywords to Include ---\nPlease ensure these important keywords are naturally incorporated into the resume: ${missingKeywords.join(', ')}`);
    }
    if (atsSuggestions.length > 0) {
      parts.push(`--- ATS Improvement Suggestions ---\n${atsSuggestions.join('\n\n')}`);
    }
    if (parts.length === 0) return;

    const combined = parts.join('\n\n');
    if (hasOptionalInstructions) {
      const hasKw = optionalInstructions.includes('Missing Keywords to Include');
      const hasSug = optionalInstructions.includes('ATS Improvement Suggestions');
      if (!hasKw || !hasSug) {
        setOptionalInstructions(prev => {
          const cleaned = prev
            .replace(/--- Missing Keywords to Include ---[\s\S]*?(?=---|$)/g, '')
            .replace(/--- ATS Improvement Suggestions ---[\s\S]*?(?=---|$)/g, '')
            .trim();
          return cleaned ? `${cleaned}\n\n${combined}` : combined;
        });
      }
    } else {
      setHasOptionalInstructions(true);
      setOptionalInstructions(combined);
    }
  }, [atsSuggestions, missingKeywords]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    atsSuggestions, setAtsSuggestions,
    missingKeywords, setMissingKeywords,
    hasOptionalInstructions, setHasOptionalInstructions,
    optionalInstructions, setOptionalInstructions,
    handleMissingKeywords: (kw: string[]) => setMissingKeywords(kw),
  };
}
```

- [ ] **Step 5: Update `App.tsx` to use the 4 new hooks**

In `src/App.tsx`:

1. Add imports:
```typescript
import { useSelectedTemplate } from './hooks/useSelectedTemplate';
import { useActivePrompts } from './hooks/useActivePrompts';
import { useFastCompile } from './hooks/useFastCompile';
import { useATSInstructions } from './hooks/useATSInstructions';
```

2. Remove the following useState declarations and their associated useEffects (they move into hooks):
   - `selectedTemplateId`, `selectedCoverLetterTemplateId` + their 3 useEffects
   - `activePrompts` + its useEffect slice
   - `fastCompile`, `fastCompileATS`, `fastSettingsOpen`, `fastAtsComplete`, `isCompiling` + their useEffects
   - `atsSuggestions`, `missingKeywords`, `hasOptionalInstructions`, `optionalInstructions` + their useEffect
   - `handleToggleFastCompileATS`, `handleMissingKeywords` callbacks

3. Replace with hook calls:
```typescript
const {
  selectedTemplateId, setSelectedTemplateId,
  selectedCoverLetterTemplateId, setSelectedCoverLetterTemplateId,
} = useSelectedTemplate(currentUser);

const { activePrompts, setActivePrompts } = useActivePrompts(currentUser);

const {
  atsSuggestions, setAtsSuggestions,
  missingKeywords,
  hasOptionalInstructions, setHasOptionalInstructions,
  optionalInstructions, setOptionalInstructions,
  handleMissingKeywords,
} = useATSInstructions();

const {
  fastCompile, setFastCompile,
  fastCompileATS, handleToggleFastCompileATS,
  fastSettingsOpen, setFastSettingsOpen,
  fastAtsComplete, setFastAtsComplete,
  isCompiling, setIsCompiling,
} = useFastCompile(jobDescription);
```

- [ ] **Step 6: Build check**

```
npm run build
```

TypeScript will flag any missing variables — if a variable name you removed is still referenced in App.tsx, either it wasn't in the hook output or you missed renaming it. Fix each error.

- [ ] **Step 7: Smoke test**

`npm run dev` — verify fast compile toggle, template selection, and ATS suggestions still work in the browser.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useSelectedTemplate.ts src/hooks/useActivePrompts.ts src/hooks/useFastCompile.ts src/hooks/useATSInstructions.ts src/App.tsx
git commit -m "refactor: extract 4 custom hooks from App.tsx, reduce state surface"
```

---

## Task 7: Decompose OnboardingWizard — Extract Step Components and `defaultProfile`

`OnboardingWizard.tsx` is 1,614 lines with all 11 steps inline. Extract steps and shared factories.

**Files:**
- Create: `src/lib/onboardingDefaults.ts` — `defaultProfile()` factory
- Create: `src/components/onboarding/steps/PersonalInfoStep.tsx`
- Create: `src/components/onboarding/steps/ExperienceStep.tsx`
- Create: `src/components/onboarding/steps/EducationStep.tsx`
- Create: `src/components/onboarding/steps/SkillsStep.tsx`
- Create: `src/components/onboarding/steps/ProjectsStep.tsx`
- Create: `src/components/onboarding/steps/SummaryStep.tsx`
- Create: `src/components/onboarding/steps/VerifyStep.tsx`
- Create: `src/components/onboarding/steps/ReviewStep.tsx`
- (Additional steps as found in the file)
- Modify: `src/components/OnboardingWizard.tsx` — import from step files
- Modify: `src/pages/ResumeGeneratorPage.tsx` — import `defaultProfile` from shared location

**Interfaces:**
- `defaultProfile(): ResumeProfile` — same return type as the current inline factory
- Each step component: `(props: { profile: ResumeProfile; onChange: (p: ResumeProfile) => void }) => JSX.Element`

- [ ] **Step 1: Identify all steps and inline components in `OnboardingWizard.tsx`**

```bash
grep -n "const.*Step\|function.*Step" src/components/OnboardingWizard.tsx
```

List every step component name. This determines how many files to create.

- [ ] **Step 2: Create `src/lib/onboardingDefaults.ts`**

Copy the `defaultProfile()` function from `OnboardingWizard.tsx` (lines 47-68):

```typescript
import type { ResumeProfile } from '@/types/resumeProfile';

export function defaultProfile(): ResumeProfile {
  return {
    // copy exact return value from OnboardingWizard.tsx lines 47-68
    // do not change any field names or default values
  };
}
```

- [ ] **Step 3: Update `ResumeGeneratorPage.tsx`**

Find `defaultProfile` usage in `src/pages/ResumeGeneratorPage.tsx`:
```bash
grep -n "defaultProfile" src/pages/ResumeGeneratorPage.tsx
```

Change its import to:
```typescript
import { defaultProfile } from '@/lib/onboardingDefaults';
```

Remove the inline `defaultProfile` definition if it exists in that file.

- [ ] **Step 4: Extract each step to its own file**

For each step component found in Step 1, create `src/components/onboarding/steps/<StepName>.tsx`:

1. Copy the entire step component function body from `OnboardingWizard.tsx`
2. Add the necessary imports at the top of the new file (React, types, UI components used by that step)
3. Export the component: `export function PersonalInfoStep(...)` etc.

Example for PersonalInfoStep:
```tsx
import type { ResumeProfile } from '@/types/resumeProfile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// ... other imports used by this step

interface PersonalInfoStepProps {
  profile: ResumeProfile;
  onChange: (profile: ResumeProfile) => void;
}

export function PersonalInfoStep({ profile, onChange }: PersonalInfoStepProps) {
  // paste the exact body from OnboardingWizard.tsx
}
```

Repeat for each step.

- [ ] **Step 5: Update `OnboardingWizard.tsx`**

Replace each inline step function definition with an import:
```typescript
import { PersonalInfoStep } from './onboarding/steps/PersonalInfoStep';
import { ExperienceStep } from './onboarding/steps/ExperienceStep';
// ... all other steps
```

Remove the `defaultProfile` function definition from `OnboardingWizard.tsx` and replace with:
```typescript
import { defaultProfile } from '@/lib/onboardingDefaults';
```

- [ ] **Step 6: Build check**

```
npm run build
```

TypeScript will catch any missing imports in step files. Fix each error — likely missing UI component imports.

- [ ] **Step 7: Smoke test onboarding**

`npm run dev` — sign in with a new account and go through the onboarding wizard. Verify all steps render correctly and data carries through.

- [ ] **Step 8: Commit**

```bash
git add src/lib/onboardingDefaults.ts src/components/onboarding/ src/components/OnboardingWizard.tsx src/pages/ResumeGeneratorPage.tsx
git commit -m "refactor: decompose OnboardingWizard into step components, extract defaultProfile"
```

---

## Self-Review

### Spec Coverage

| Issue from review.md | Task |
|---|---|
| App.tsx god component | Task 6 |
| Duplicate data persistence | Task 3 |
| Duplicate logging | Task 4 |
| Token split / double-deduction | Task 5 |
| OnboardingWizard 1614 lines | Task 7 |
| ATS logic duplicated | Task 2 |
| LaTeX cleaning duplicated | Task 1 |
| Multiple Firebase init patterns | Not included — single file already, low risk, left as-is |
| Inconsistent error handling | Not included — large scope, no bugs caused, deferred |
| Profile gate spread across 3 files | Not included — no bug, deferred |
| Onboarding → resume save not atomic | Not included — edge case, tracked but deferred |
| Token race condition | Partially fixed by Task 5 (fresh balance read); full Firestore transaction fix deferred |
| FastCompile state machine | Task 6 (`useFastCompile` sets up the state cluster; explicit FSM deferred) |
| Prop drilling (SettingsDialog) | Not included — deferred after App.tsx hooks are extracted |

### Placeholder Scan

No TBD, no "implement later". Step 4 of Task 7 says "paste the exact body" which is intentional — the step bodies are in the existing file and don't need to be reproduced in this plan.

### Type Consistency

- `ATSSuggestion` from `src/hooks/useAIService.ts` used in Tasks 1 and 2 — consistent
- `ResumeProfile` from `src/types/resumeProfile.ts` used in Task 7 — consistent
- `PromptType` from `src/types` used in Task 6 — consistent
- `User` from `firebase/auth` used in Task 6 hooks — consistent
