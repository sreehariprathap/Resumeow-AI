# Tier-Aware LLM Routing & Admin Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce tier-based LLM model routing (free→Gemini Flash, pro→DeepSeek), create the LLM distribution doc, and enhance the admin page with an edit modal, always-visible token requests, and promote/demote shortcuts.

**Architecture:** `llm.config.ts` gains a `tierOverrides` field per task; `llmConfigResolver.ts` accepts a `plan` and merges the correct override before dispatching. `tokenContext` exposes `plan`. The admin page grows a `<AdminEditModal>` component and always renders the token requests section.

**Tech Stack:** React 18, TypeScript, Firebase Firestore (`updateDoc`), Shadcn/UI (`Dialog`, `Button`, `Input`, `Select`, `Badge`), Sonner toasts, Jest + ts-jest for unit tests.

## Global Constraints

- All files are TypeScript — no `any` except where pre-existing and necessary.
- Follow existing import alias: `@/` maps to `src/`.
- Firestore writes go through `firebaseWeb.ts` helpers — never inline Firestore calls in components.
- No new npm dependencies — use only what's already installed.
- Token deduction behaviour is unchanged — only model routing changes.
- `plan` defaults to `'free'` whenever the Firestore profile is missing or doesn't have the field.
- Run `npx jest --testPathPattern=<file>` (not `npm test`) for targeted test runs.

---

## Task 1: LLM Calls & Distributions doc

**Files:**
- Create: `docs/llm-calls-and-distributions.md`

**Interfaces:**
- Consumes: nothing
- Produces: a Markdown table for human review; no code depends on it

- [ ] **Step 1: Create the doc**

Create `docs/llm-calls-and-distributions.md` with the following exact content:

```markdown
# LLM Calls & Distributions

This table lists every LLM call made by Resumeow-AI, which task key controls it,
where in the codebase it's triggered, and what model each user tier uses.

**How to configure:** Edit `src/config/llm.config.ts`.
- The top-level task entry (no `tierOverrides`) is the **Free tier** model.
- Add/edit `tierOverrides.pro` on a task entry to set the **Pro tier** model.
- See `src/config/llm.config.md` for a full configuration guide.

| Feature | Task Key | Triggered From | Free Tier LLM | Pro Tier LLM | Notes |
|---|---|---|---|---|---|
| Resume LaTeX generation | `resumeLatex` | `ResumeGeneratorPage`, `OnboardingWizard` | `gemini-3.5-flash` | _(configure in llm.config.ts)_ | Heavy — full LaTeX doc |
| Cover letter generation | `coverLetter` | `useAIService.makeWritingCall` | `gemini-3.5-flash` | _(configure)_ | Creative prose, temp 0.7 |
| ATS analysis | `atsAnalysis` | `useAIService.analyzeATS` | `gemini-3.5-flash` | _(configure)_ | JSON output, temp 0 |
| Combined ATS + suggestions | `combinedATS` | `useAIService.analyzeCombinedATS`, `JDMatcherPage` | `gemini-3.5-flash` | _(configure)_ | JSON output, temp 0 |
| Job details extraction | `extractJobDetails` | `useAIService.extractJobDetails` | `gemini-3.5-flash` | _(configure)_ | Lightweight, max 1024 tokens |
| Job fit scoring | `jobFit` | `useAIService.analyzeJobFit`, `JDMatcherPage` | `gemini-3.5-flash` | _(configure)_ | JSON output, temp 0 |
| Resume parsing | `resumeParse` | `ResumeGeneratorPage` (PDF upload) | `gemini-3.5-flash` | _(configure)_ | Profile JSON extraction |
| Lazy pipeline — JD analysis | `lazyPipelineJD` | `LazyModePage` | `gemini-3.5-flash` | _(configure)_ | Structured, long context |
| Lazy pipeline — LaTeX generation | `lazyPipelineLatex` | `LazyModePage` | `gemini-3.5-flash` | _(configure)_ | Thinking enabled, max 16384 |
| Resume scoring | `resumeScore` | `ResumeScoringPage` | `gemini-3.5-flash` | _(configure)_ | JSON output, temp 0 |
| JD matcher | `jdMatcher` | `JDMatcherPage` | `gemini-3.5-flash` | _(configure)_ | JSON output, temp 0 |
| Bio summary | `bioSummary` | `OnboardingWizard` (ExtrasStep) | `gemini-3.5-flash` | _(configure)_ | Short output, max 512 tokens |
```

- [ ] **Step 2: Commit**

```bash
git add docs/llm-calls-and-distributions.md
git commit -m "docs: add LLM calls and distributions table"
```

---

## Task 2: Extend `llm.config.ts` with `tierOverrides` + companion doc

**Files:**
- Modify: `src/config/llm.config.ts`
- Create: `src/config/llm.config.md`

**Interfaces:**
- Consumes: nothing new (self-contained config change)
- Produces:
  - `LLMTaskConfig.tierOverrides?: Partial<Record<'free' | 'pro' | 'admin', Partial<LLMTaskConfig>>>` — new optional field on the interface
  - `getTaskConfig(task, plan)` in Task 3 will read `tierOverrides[plan]`

- [ ] **Step 1: Add `tierOverrides` to `LLMTaskConfig` interface**

In `src/config/llm.config.ts`, find the `LLMTaskConfig` interface (line ~57) and add the new field after `systemPrompt`:

```ts
export interface LLMTaskConfig {
  model: string;
  provider: AIProvider;
  temperature?: number;
  thinking?: boolean;
  maxTokens?: number;
  concurrency?: number;
  systemPrompt?: string;
  /**
   * Per-tier model overrides. When a user's plan matches a key here,
   * the fields defined here replace the task-level values for that call.
   * Shallow merge only — each field listed overrides the base value.
   *
   * Example:
   *   tierOverrides: {
   *     pro: { model: MODELS.deepseek.pro, provider: 'deepseek', thinking: true }
   *   }
   *
   * Free tier: uses the task-level defaults (no tierOverrides needed).
   * Pro tier:  uses tierOverrides.pro if present, otherwise task-level defaults.
   * Admin:     treated the same as pro.
   */
  tierOverrides?: Partial<Record<'free' | 'pro' | 'admin', Partial<Omit<LLMTaskConfig, 'tierOverrides'>>>>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Create the companion config doc**

Create `src/config/llm.config.md` with the following content:

````markdown
# llm.config.ts — Configuration Guide

This file is the **single source of truth** for every LLM call in Resumeow-AI.
Edit this file to change which model handles any feature, for any user tier.

## Quick Reference

```ts
import { MODELS } from './llm.config';

MODELS.gemini.flash   // 'gemini-3.5-flash'   — fast, cheap (Free tier default)
MODELS.gemini.pro     // 'gemini-3.0-pro'      — high quality reasoning
MODELS.deepseek.flash // 'deepseek-v4-flash'   — fast, cheap (Pro lightweight)
MODELS.deepseek.pro   // 'deepseek-v4-pro'     — best quality, supports thinking
```

## How Tier Routing Works

Every task has a base config (the free tier). To give pro users a different model,
add a `tierOverrides.pro` block to that task:

```ts
resumeLatex: {
  model: MODELS.gemini.flash,   // ← Free tier uses this
  provider: 'gemini',
  maxTokens: 16384,
  tierOverrides: {
    pro: {
      model: MODELS.deepseek.pro,     // ← Pro tier uses this instead
      provider: 'deepseek',
      thinking: true,                 // ← And enables chain-of-thought
    }
  }
}
```

Fields NOT listed in `tierOverrides.pro` inherit from the task-level base config.
For example, if you only override `model` and `provider`, `maxTokens` stays the same.

`admin` users are routed the same as `pro` by default. You can add a separate
`tierOverrides.admin` block if admins need a different config (rarely needed).

## Field Reference

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Exact API model ID sent to the provider |
| `provider` | `'gemini' \| 'deepseek' \| 'openrouter'` | Which provider API to call |
| `temperature` | `number` | 0 = deterministic (JSON tasks). 0.7+ = creative (writing) |
| `thinking` | `boolean` | Enables chain-of-thought. Supported on `deepseek-v4-pro` and Gemini 2.5+. Costs 2–5× more. Only enable for high-stakes generation. |
| `maxTokens` | `number` | Caps output length. Too low = truncated responses. |
| `concurrency` | `number` | Max parallel calls (rarely needs changing) |
| `systemPrompt` | `string` | Injected on every call. Keep short — counts as input tokens. |
| `tierOverrides` | `object` | Per-tier overrides. Keys: `'free' \| 'pro' \| 'admin'` |

## Adding a New Task

1. Add the task key to the `LLMTaskKey` union type.
2. Add an entry to `llmConfig.tasks` with at minimum `model` and `provider`.
3. Add a row to `docs/llm-calls-and-distributions.md`.
4. Call it via `callForTask('yourNewKey', prompt)` in `useAIService.ts`.

## Upgrading a Pro Task's Model

To upgrade the pro tier of `resumeScore` from Gemini Flash to DeepSeek Flash:

```ts
resumeScore: {
  model: MODELS.gemini.flash,   // free unchanged
  provider: 'gemini',
  temperature: 0,
  tierOverrides: {
    pro: { model: MODELS.deepseek.flash, provider: 'deepseek' }
  }
},
```

## Cost Notes

- `thinking: true` on DeepSeek Pro bills reasoning tokens separately at 2–5× output rate.
- Only enable `thinking` for the heaviest generation tasks (full resume LaTeX, lazy pipeline LaTeX).
- DeepSeek Flash is roughly equivalent in cost to Gemini Flash.
- Use `maxTokens` conservatively on extraction tasks (JSON output rarely needs >2048 tokens).
````

- [ ] **Step 4: Commit**

```bash
git add src/config/llm.config.ts src/config/llm.config.md
git commit -m "feat: add tierOverrides field to LLMTaskConfig + companion config guide"
```

---

## Task 3: Update `llmConfigResolver.ts` to accept and apply `plan`

**Files:**
- Modify: `src/lib/llmConfigResolver.ts`
- Modify: `src/lib/__tests__/llmConfigResolver.test.ts`

**Interfaces:**
- Consumes: `LLMTaskConfig.tierOverrides` from Task 2
- Produces:
  - `getTaskConfig(task: LLMTaskKey, plan?: 'free' | 'pro' | 'admin'): Required<LLMTaskConfig>` — plan param added, defaults to `'free'`
  - `callForTask(task, prompt, plan, makeAICallWithModel, makeAICallWithThinking)` — plan param added

- [ ] **Step 1: Write the failing tests**

Replace `src/lib/__tests__/llmConfigResolver.test.ts` entirely with:

```ts
import { getTaskConfig } from '../llmConfigResolver';
import { llmConfig, MODELS } from '../../config/llm.config';

describe('getTaskConfig', () => {
  it('returns defaults for a task not in tasks map', () => {
    const original = { ...llmConfig.tasks };
    (llmConfig.tasks as Record<string, unknown>) = {};
    const config = getTaskConfig('resumeLatex', 'free');
    expect(config.model).toBe(llmConfig.defaults.model);
    expect(config.provider).toBe(llmConfig.defaults.provider);
    (llmConfig.tasks as Record<string, unknown>) = original;
  });

  it('returns task-level config for free tier', () => {
    const config = getTaskConfig('resumeLatex', 'free');
    expect(config.model).toBe(MODELS.gemini.flash);
    expect(config.provider).toBe('gemini');
  });

  it('applies tierOverrides.pro for pro users when override exists', () => {
    // Temporarily inject a tierOverride to test resolution
    const task = llmConfig.tasks['resumeLatex']!;
    const original = task.tierOverrides;
    task.tierOverrides = {
      pro: { model: MODELS.deepseek.pro, provider: 'deepseek', thinking: true }
    };
    const config = getTaskConfig('resumeLatex', 'pro');
    expect(config.model).toBe(MODELS.deepseek.pro);
    expect(config.provider).toBe('deepseek');
    expect(config.thinking).toBe(true);
    task.tierOverrides = original;
  });

  it('treats admin tier the same as pro when tierOverrides.admin not set', () => {
    const task = llmConfig.tasks['resumeLatex']!;
    const original = task.tierOverrides;
    task.tierOverrides = {
      pro: { model: MODELS.deepseek.pro, provider: 'deepseek' }
    };
    const config = getTaskConfig('resumeLatex', 'admin');
    expect(config.model).toBe(MODELS.deepseek.pro);
    task.tierOverrides = original;
  });

  it('falls back to task-level config when pro override not set', () => {
    const task = llmConfig.tasks['bioSummary']!;
    const original = task.tierOverrides;
    delete task.tierOverrides;
    const config = getTaskConfig('bioSummary', 'pro');
    expect(config.model).toBe(MODELS.gemini.flash);
    task.tierOverrides = original;
  });

  it('returns full Required<LLMTaskConfig> with no undefined fields', () => {
    const config = getTaskConfig('bioSummary', 'free');
    const requiredKeys: (keyof typeof config)[] = [
      'model', 'provider', 'temperature', 'thinking',
      'maxTokens', 'concurrency', 'systemPrompt',
    ];
    for (const key of requiredKeys) {
      expect(config[key]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest --testPathPattern=llmConfigResolver -t "applies tierOverrides"
```

Expected: FAIL — `getTaskConfig` doesn't accept a `plan` arg yet.

- [ ] **Step 3: Update `llmConfigResolver.ts`**

Replace `src/lib/llmConfigResolver.ts` entirely with:

```ts
import { llmConfig, type LLMTaskKey, type LLMTaskConfig } from '../config/llm.config';
import type { AIProvider } from '@/lib/aiProviderContext';

type Plan = 'free' | 'pro' | 'admin';

/**
 * Resolve the full task config for the given plan.
 *
 * Resolution order (shallow merge, later entries win):
 *  1. llmConfig.defaults
 *  2. llmConfig.tasks[task]  (task-level overrides)
 *  3. task.tierOverrides[plan]  (tier-specific overrides, if present)
 *
 * Admin is treated as pro unless a separate tierOverrides.admin block exists.
 * Plan defaults to 'free' when omitted.
 */
export function getTaskConfig(task: LLMTaskKey, plan: Plan = 'free'): Required<LLMTaskConfig> {
  const taskOverride = llmConfig.tasks[task] ?? {};
  const base = { ...llmConfig.defaults, ...taskOverride };

  // admin falls back to pro tier override if no admin-specific override exists
  const effectivePlan: Plan = plan === 'admin'
    ? (taskOverride.tierOverrides?.admin ? 'admin' : 'pro')
    : plan;

  const tierOverride = taskOverride.tierOverrides?.[effectivePlan] ?? {};
  return { ...base, ...tierOverride } as Required<LLMTaskConfig>;
}

/**
 * Resolve the task config for the given plan and dispatch to the correct AI call.
 *
 * The `makeAICallWithModel` and `makeAICallWithThinking` callbacks both accept
 * an explicit `provider` argument so the task config is the authoritative source.
 */
export async function callForTask(
  task: LLMTaskKey,
  prompt: string,
  plan: Plan,
  makeAICallWithModel: (prompt: string, modelId: string, provider: AIProvider) => Promise<string>,
  makeAICallWithThinking: (prompt: string, provider: AIProvider) => Promise<string>
): Promise<string> {
  const config = getTaskConfig(task, plan);

  if (config.thinking) {
    if (config.provider !== 'deepseek' && config.provider !== 'gemini') {
      console.warn(
        `[llmConfig] thinking:true set for task "${task}" but provider is "${config.provider}". ` +
        `Falling back to standard call — thinking is not supported on this provider.`
      );
      return makeAICallWithModel(prompt, config.model, config.provider);
    }
    return makeAICallWithThinking(prompt, config.provider);
  }

  return makeAICallWithModel(prompt, config.model, config.provider);
}
```

- [ ] **Step 4: Run all resolver tests**

```bash
npx jest --testPathPattern=llmConfigResolver
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/llmConfigResolver.ts src/lib/__tests__/llmConfigResolver.test.ts
git commit -m "feat: tier-aware LLM resolver — getTaskConfig and callForTask accept plan"
```

---

## Task 4: Expose `plan` from `tokenContext` + update `useAIService`

**Files:**
- Modify: `src/lib/tokenContext.tsx`
- Modify: `src/hooks/useAIService.ts`

**Interfaces:**
- Consumes: `UserProfile.plan` (already on Firestore profile); `callForTask(task, prompt, plan, ...)` from Task 3
- Produces:
  - `useTokens()` returns `plan: 'free' | 'pro' | 'admin'`
  - `callForTaskBound(task, prompt)` internally resolves using the current user's plan

- [ ] **Step 1: Add `plan` to `TokenContextType` in `tokenContext.tsx`**

In `src/lib/tokenContext.tsx`, update the `TokenContextType` interface — add `plan` after `isAdmin`:

```ts
interface TokenContextType {
  profile: UserProfile | null;
  tokensRemaining: number;
  tokensUsed: number;
  tokensAllocated: number;
  isAdmin: boolean;
  plan: 'free' | 'pro' | 'admin';   // ← add this line
  isLoading: boolean;
  deductTokens: (chars: number) => Promise<boolean>;
  refetch: () => Promise<void>;
  assertSufficientBalance: () => Promise<void>;
}
```

- [ ] **Step 2: Provide `plan` value in the Provider return**

In `src/lib/tokenContext.tsx`, find the `<TokenContext.Provider value={{...}}>` block and add `plan` after `isAdmin`:

```ts
return (
  <TokenContext.Provider value={{
    profile,
    tokensRemaining: profile?.tokensRemaining ?? 0,
    tokensUsed: profile?.tokensUsed ?? 0,
    tokensAllocated: profile?.tokensAllocated ?? 0,
    isAdmin: profile?.isAdmin ?? false,
    plan: profile?.plan ?? 'free',   // ← add this line
    isLoading,
    deductTokens,
    refetch,
    assertSufficientBalance,
  }}>
    {children}
  </TokenContext.Provider>
);
```

- [ ] **Step 3: Update `callForTaskBound` in `useAIService.ts`**

In `src/hooks/useAIService.ts`, update the `useTokens()` destructure to include `plan`:

```ts
// Before (line ~66):
const { assertSufficientBalance, deductTokens } = useTokens();

// After:
const { assertSufficientBalance, deductTokens, plan } = useTokens();
```

Then update `callForTaskBound` to pass `plan` to `resolveAndCall` (line ~149):

```ts
// Before:
const response = await resolveAndCall(task, prompt, makeAICallWithModel, makeAICallWithThinking);

// After:
const response = await resolveAndCall(task, prompt, plan, makeAICallWithModel, makeAICallWithThinking);
```

Also update the `useCallback` dependency array to include `plan` (line ~156):

```ts
// Before:
}, [makeAICallWithModel, makeAICallWithThinking, hasAvailableProviders, checkTokens, bill]);

// After:
}, [plan, makeAICallWithModel, makeAICallWithThinking, hasAvailableProviders, checkTokens, bill]);
```

- [ ] **Step 4: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tokenContext.tsx src/hooks/useAIService.ts
git commit -m "feat: expose plan from tokenContext; pass plan to LLM resolver"
```

---

## Task 5: Add `adminUpdateUserProfile` to `firebaseWeb.ts`

**Files:**
- Modify: `src/lib/firebaseWeb.ts`

**Interfaces:**
- Consumes: existing `userProfiles/{uid}` Firestore doc
- Produces:
  - `adminUpdateUserProfile(uid: string, updates: { displayName?: string; tokensAllocated?: number; plan?: 'free' | 'pro' | 'admin' }): Promise<void>`

- [ ] **Step 1: Add the function to `firebaseWeb.ts`**

In `src/lib/firebaseWeb.ts`, add the following after `adminUpdateUserTokens` (after line ~370):

```ts
/** Admin: update a user's display name, token allocation, and/or plan */
export const adminUpdateUserProfile = async (
  uid: string,
  updates: {
    displayName?: string;
    tokensAllocated?: number;
    plan?: 'free' | 'pro' | 'admin';
  }
): Promise<void> => {
  const profileRef = doc(db, 'userProfiles', uid);
  const snap = await getDoc(profileRef);
  if (!snap.exists()) return;

  const patch: Record<string, unknown> = {};

  if (updates.displayName !== undefined) {
    patch.displayName = updates.displayName;
  }

  if (updates.tokensAllocated !== undefined) {
    const profile = snap.data() as UserProfile;
    const newRemaining = Math.max(0, updates.tokensAllocated - profile.tokensUsed);
    patch.tokensAllocated = updates.tokensAllocated;
    patch.tokensRemaining = newRemaining;
  }

  if (updates.plan !== undefined) {
    patch.plan = updates.plan;
    patch.isAdmin = updates.plan === 'admin';
  }

  if (Object.keys(patch).length === 0) return;
  await updateDoc(profileRef, patch);
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebaseWeb.ts
git commit -m "feat: add adminUpdateUserProfile Firebase helper"
```

---

## Task 6: `AdminEditModal` component

**Files:**
- Create: `src/components/AdminEditModal.tsx`

**Interfaces:**
- Consumes: `adminUpdateUserProfile` from Task 5; `UserProfile` from `firebaseWeb.ts`; Shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `Input`, `Select`, `Button`, `Label`
- Produces:
  - `<AdminEditModal user={UserProfile | null} onClose={() => void} onSaved={() => void} />`

- [ ] **Step 1: Create `src/components/AdminEditModal.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { adminUpdateUserProfile, type UserProfile } from '@/lib/firebaseWeb';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface AdminEditModalProps {
  user: UserProfile | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminEditModal({ user, onClose, onSaved }: AdminEditModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [tokensAllocated, setTokensAllocated] = useState('');
  const [plan, setPlan] = useState<'free' | 'pro' | 'admin'>('free');
  const [saving, setSaving] = useState(false);

  // Sync form state whenever the selected user changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setTokensAllocated(String(user.tokensAllocated));
      setPlan(user.plan);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const tokens = parseInt(tokensAllocated, 10);
    if (isNaN(tokens) || tokens < 0) {
      toast.error('Token allocation must be a non-negative number');
      return;
    }
    setSaving(true);
    try {
      await adminUpdateUserProfile(user.uid, {
        displayName: displayName.trim() || user.displayName,
        tokensAllocated: tokens,
        plan,
      });
      toast.success(`${displayName || user.displayName} updated`);
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to save: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Display name */}
          <div className="space-y-1">
            <Label htmlFor="edit-display-name">Display name</Label>
            <Input
              id="edit-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
            />
          </div>

          {/* Email — read-only */}
          <div className="space-y-1">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              value={user?.email ?? ''}
              readOnly
              disabled
              className="opacity-60 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Email is managed by Firebase Auth and cannot be changed here.
            </p>
          </div>

          {/* Tokens allocated */}
          <div className="space-y-1">
            <Label htmlFor="edit-tokens">Tokens allocated</Label>
            <Input
              id="edit-tokens"
              type="number"
              min={0}
              value={tokensAllocated}
              onChange={(e) => setTokensAllocated(e.target.value)}
            />
          </div>

          {/* Plan */}
          <div className="space-y-1">
            <Label htmlFor="edit-plan">Plan</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as 'free' | 'pro' | 'admin')}>
              <SelectTrigger id="edit-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminEditModal.tsx
git commit -m "feat: add AdminEditModal component"
```

---

## Task 7: Update `AdminPage.tsx` — modal, promote/demote, always-visible requests

**Files:**
- Modify: `src/pages/AdminPage.tsx`

**Interfaces:**
- Consumes: `<AdminEditModal>` from Task 6; `adminUpdateUserProfile` from Task 5; `UserProfile` from `firebaseWeb.ts`
- Produces: fully updated admin UI with modal, quick tier buttons, always-visible token requests

- [ ] **Step 1: Add `AdminEditModal` import and `editingUser` state**

At the top of `src/pages/AdminPage.tsx`, add the import alongside existing imports:

```ts
import { AdminEditModal } from '@/components/AdminEditModal';
```

Add state for the modal (after the existing `grantAmounts` state, line ~26):

```ts
const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
```

Remove the existing `editing` state (line ~22) — the modal replaces the inline edit pattern entirely:

```ts
// Remove this line:
const [editing, setEditing] = useState<{ uid: string; tokens: string; plan: string } | null>(null);
```

- [ ] **Step 2: Add `handleQuickPlanChange` handler**

After `handleSave` (which will be removed — see step below), add:

```ts
const handleQuickPlanChange = async (uid: string, newPlan: 'free' | 'pro') => {
  try {
    await adminUpdateUserProfile(uid, { plan: newPlan });
    toast.success(`User ${newPlan === 'pro' ? 'promoted to Pro' : 'moved to Free'}`);
    await fetchUsers();
  } catch (err) {
    toast.error('Plan update failed');
  }
};
```

Also add the import for `adminUpdateUserProfile` to the existing import line from `firebaseWeb`:

```ts
// Find the existing import and add adminUpdateUserProfile:
import { getAllUserProfiles, adminUpdateUserTokens, adminUpdateUserProfile, getTokenRequests, resolveTokenRequest, type UserProfile, type TokenRequest } from '@/lib/firebaseWeb';
```

Remove the old `handleSave` function entirely — the modal handles saves now.

- [ ] **Step 3: Make token requests always visible**

Find the token requests block (line ~163):

```tsx
{/* Before — remove the conditional */}
{(tokenRequests.length > 0 || requestsLoading) && (
  <Card className="border-yellow-500/30 bg-yellow-500/5">
    ...
  </Card>
)}
```

Replace with (remove the outer conditional entirely, always render the Card):

```tsx
<Card className="border-yellow-500/30 bg-yellow-500/5">
  <CardHeader>
    <div className="font-semibold flex items-center gap-2">
      <Zap className="h-4 w-4 text-yellow-500" />
      Pending Token Requests
      <span className="ml-1 inline-flex items-center justify-center rounded-full bg-yellow-500/20 text-yellow-600 text-xs font-bold px-2 py-0.5 min-w-[1.5rem]">
        {tokenRequests.length}
      </span>
    </div>
  </CardHeader>
  <CardContent>
    {requestsLoading ? (
      <div className="flex justify-center py-4"><RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /></div>
    ) : tokenRequests.length === 0 ? (
      <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
        <Zap className="h-8 w-8 opacity-30" />
        <span className="text-sm">No pending requests. You&apos;re all caught up ✓</span>
      </div>
    ) : (
      <div className="space-y-3">
        {tokenRequests.map(req => (
          <div key={req.id} className="flex items-start justify-between gap-4 p-3 rounded-md bg-background border">
            <div className="space-y-0.5 min-w-0">
              <div className="font-medium text-sm">{req.displayName}</div>
              <div className="text-xs text-muted-foreground">{req.email}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Requested <span className="font-medium text-foreground">{req.requestedTokens} tokens</span> · {new Date(req.createdAt).toLocaleDateString()}
              </div>
              <div className="text-xs italic text-muted-foreground">"{req.reason}"</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                type="number"
                min={1}
                max={1000}
                className="h-7 w-20 text-xs font-mono"
                value={grantAmounts[req.id!] ?? String(req.requestedTokens)}
                onChange={e => setGrantAmounts(prev => ({ ...prev, [req.id!]: e.target.value }))}
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={resolvingId === req.id || parseInt(grantAmounts[req.id!] ?? String(req.requestedTokens), 10) < 1}
                onClick={() => void handleResolve(req, true)}
              >
                {resolvingId === req.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Approve'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive hover:text-destructive"
                disabled={resolvingId === req.id}
                onClick={() => void handleResolve(req, false)}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

- [ ] **Step 4: Update the user table — replace inline edit with modal + quick buttons**

In the user table's action column (lines ~313–330), replace the entire `<td>` actions cell with:

```tsx
<td className="py-3">
  <div className="flex gap-1 flex-wrap">
    {/* Quick promote / demote — not shown for admin accounts */}
    {u.plan === 'free' && (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => void handleQuickPlanChange(u.uid, 'pro')}
      >
        → Pro
      </Button>
    )}
    {u.plan === 'pro' && (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => void handleQuickPlanChange(u.uid, 'free')}
      >
        → Free
      </Button>
    )}
    {/* Edit button — opens modal */}
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs"
      onClick={() => setEditingUser(u)}
    >
      Edit
    </Button>
  </div>
</td>
```

Also remove the `isEditingThis` conditional rendering in the Plan and Allocated columns — they no longer need inline inputs. Replace:

```tsx
{/* Plan column — remove inline edit, always show badge */}
<td className="py-3 pr-4">
  <Badge variant={u.plan === 'admin' ? 'destructive' : u.plan === 'pro' ? 'default' : 'secondary'}>
    {u.plan}
  </Badge>
</td>

{/* Allocated column — remove inline edit, always show value */}
<td className="py-3 pr-4 font-mono">
  {u.tokensAllocated.toLocaleString()}
</td>
```

- [ ] **Step 5: Add `<AdminEditModal>` to the JSX return**

Just before the closing `</div>` at the end of the component return (before `</div>` that closes `max-w-6xl`), add:

```tsx
<AdminEditModal
  user={editingUser}
  onClose={() => setEditingUser(null)}
  onSaved={() => void fetchUsers()}
/>
```

- [ ] **Step 6: Clean up unused imports and state**

Remove `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from imports if they are no longer used anywhere else in `AdminPage.tsx`. Also remove the `editing` state and `handleSave` function that were deleted in steps above.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/AdminPage.tsx
git commit -m "feat: admin page — edit modal, promote/demote buttons, always-visible token requests"
```

---

## Task 8: Smoke-test in browser

This task has no automated tests — it requires visual verification.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify LLM tier routing (free)**

Log in as a free-tier user. Trigger any LLM feature (e.g., resume scoring).
Open browser DevTools → Network tab → filter for API calls.
Confirm the request goes to `generativelanguage.googleapis.com` (Gemini).

- [ ] **Step 3: Verify LLM tier routing (pro) — if DeepSeek key is configured**

In Firestore console, manually set your test user's `plan` to `pro`.
Reload the app. Trigger the same LLM feature.
Confirm the request goes to `api.deepseek.com`.
(Skip this step if no DeepSeek key is set in `.env`.)

- [ ] **Step 4: Verify admin page — token requests always visible**

Open the admin page (`/admin`).
Confirm the "Pending Token Requests" card is always visible — shows empty state if no requests.
Check the count badge shows `0` when empty.

- [ ] **Step 5: Verify admin page — edit modal**

Click "Edit" on any user row.
Confirm the modal opens with the user's current name, email (read-only), tokens, and plan pre-filled.
Edit the display name and save.
Confirm the user list refreshes with the new name.

- [ ] **Step 6: Verify admin page — promote/demote**

Find a free-tier user. Click "→ Pro". Confirm badge updates to Pro and "→ Free" button appears.
Click "→ Free". Confirm badge updates to Free.

- [ ] **Step 7: Commit final smoke-test confirmation**

```bash
git add -A
git commit -m "chore: smoke-tested tier routing and admin enhancements"
```

---

## Self-Review Checklist

### Spec coverage
- ✅ §2.1 Tier rules → Task 3 `getTaskConfig` resolution logic
- ✅ §2.2 `tierOverrides` field → Task 2 interface extension
- ✅ §2.3 Resolver accepts `plan` → Task 3
- ✅ §2.4 Call-site changes → Task 4
- ✅ §2.5 `tokenContext` exposes `plan` → Task 4
- ✅ §2.6 Companion config doc → Task 2
- ✅ §3 LLM distribution table → Task 1
- ✅ §4.1 Always-visible token requests → Task 7 step 3
- ✅ §4.2 Edit modal → Task 6 + Task 7
- ✅ §4.3 Promote/demote buttons → Task 7 step 4
- ✅ §4.4 `adminUpdateUserProfile` helper → Task 5
- ✅ §5 Error handling → modal error toast (Task 6); `plan` default `'free'` (Task 4); approve button disabled when grant < 1 (Task 7)

### Type consistency
- `adminUpdateUserProfile(uid, updates)` defined in Task 5, consumed in Task 6 and Task 7 ✅
- `getTaskConfig(task, plan)` defined in Task 3, consumed in Task 3's `callForTask` ✅
- `callForTask(task, prompt, plan, makeAICallWithModel, makeAICallWithThinking)` defined in Task 3, consumed in Task 4 ✅
- `plan: 'free' | 'pro' | 'admin'` on `TokenContextType` in Task 4, destructured in Task 4 ✅
- `editingUser: UserProfile | null` state in Task 7, passed as `user` prop to `AdminEditModal` ✅

### Placeholder scan
No TBDs, no "implement later", no "add validation" without code. All steps contain exact code. ✅
