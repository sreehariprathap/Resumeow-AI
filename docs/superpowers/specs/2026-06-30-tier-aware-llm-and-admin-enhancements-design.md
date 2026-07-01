# Tier-Aware LLM Routing & Admin Enhancements — Design Spec
**Date:** 2026-06-30  
**Status:** Approved  
**Author:** Brainstorming session

---

## 1. Overview

Three self-contained deliverables that together introduce user-tier-based LLM control and improve the admin experience:

| # | Deliverable | Scope |
|---|---|---|
| 1 | **LLM Calls & Distributions doc** | Markdown table cataloguing all 12 LLM tasks with free/pro model assignments |
| 2 | **Tier-aware LLM routing** | Config + resolver changes so each task dispatches to the correct model based on user plan |
| 3 | **Admin page enhancements** | Always-visible token requests, edit modal, promote/demote shortcuts |

---

## 2. Tier-Aware LLM Routing

### 2.1 Tier Rules

| Tier | Behaviour |
|---|---|
| `free` | Always uses Gemini Flash (server key). No model choice. Task config `defaults` apply. |
| `pro` | Uses per-task `tierOverrides.pro` config. Lightweight tasks → DeepSeek Flash. Heavy tasks → DeepSeek Pro (with thinking). No user choice — task config decides. |
| `admin` | Same as `pro` routing (admins are never token-billed). |

### 2.2 `llm.config.ts` — Schema Extension

Add an optional `tierOverrides` field to `LLMTaskConfig`:

```ts
export interface LLMTaskConfig {
  model: string;
  provider: AIProvider;
  temperature?: number;
  thinking?: boolean;
  maxTokens?: number;
  concurrency?: number;
  systemPrompt?: string;
  /** Per-tier model overrides. When a user's plan matches a key here,
   *  these fields replace the task-level defaults for that call. */
  tierOverrides?: Partial<Record<'free' | 'pro' | 'admin', Partial<LLMTaskConfig>>>;
}
```

**Example task entry:**
```ts
resumeLatex: {
  model: MODELS.gemini.flash,   // free tier — server Gemini key
  provider: 'gemini',
  thinking: false,
  maxTokens: 16384,
  tierOverrides: {
    pro: {
      model: MODELS.deepseek.pro,
      provider: 'deepseek',
      thinking: true,
    }
  }
}
```

### 2.3 `llmConfigResolver.ts` — Resolver Update

`callForTask` gains a `plan` parameter:

```ts
export async function callForTask(
  task: LLMTaskKey,
  prompt: string,
  plan: 'free' | 'pro' | 'admin',
  makeAICallWithModel: ...,
  makeAICallWithThinking: ...,
): Promise<string>
```

Resolution order:
1. Start with `llmConfig.defaults`
2. Merge task-level overrides (`llmConfig.tasks[task]`)
3. If `tierOverrides[plan]` exists, merge those on top
4. Dispatch with the final resolved config

This is a shallow merge — each field is replaced, not deeply nested.

### 2.4 Call-Site Changes (`useAIService.ts`)

`callForTaskBound` reads `plan` from `useTokens()` and passes it through:

```ts
const { plan } = useTokens();  // 'free' | 'pro' | 'admin'

const callForTaskBound = useCallback(async (task, prompt) => {
  return resolveAndCall(task, prompt, plan, makeAICallWithModel, makeAICallWithThinking);
}, [plan, makeAICallWithModel, makeAICallWithThinking]);
```

`plan` is already on `UserProfile` (Firestore) and exposed by `tokenContext`. **No schema changes needed.**

### 2.5 `tokenContext.tsx` — Expose `plan`

Add `plan` to `TokenContextType`:

```ts
interface TokenContextType {
  // ... existing fields
  plan: 'free' | 'pro' | 'admin';
}
```

Value: `profile?.plan ?? 'free'` (safe default).

### 2.6 Companion Config Doc (`src/config/llm.config.md`)

A Markdown file co-located with `llm.config.ts` covering:
- What each field does (including `tierOverrides`)
- Which models exist and their cost profile
- How to assign a task to a different tier model
- When to use `thinking: true` and cost implications
- Worked examples (add a new task, upgrade pro tier for one task)

---

## 3. LLM Calls & Distributions Doc

**Path:** `docs/llm-calls-and-distributions.md`

A table with all 12 LLM task keys. Pre-filled from current config. Admin fills in the `Free Tier LLM` and `Pro Tier LLM` columns to configure the desired distribution before implementation.

**Columns:**

| Feature | Task Key | Feature Location | LLM Provider | Free Tier LLM | Pro Tier LLM | Notes |
|---|---|---|---|---|---|---|
| Resume LaTeX generation | `resumeLatex` | ResumeGeneratorPage, OnboardingWizard | Gemini / DeepSeek | _(fill in)_ | _(fill in)_ | Heavy — long output |
| ... | ... | ... | ... | _(fill in)_ | _(fill in)_ | |

The document is the **source of truth** for what you want — implementation reads from it.

---

## 4. Admin Page Enhancements

### 4.1 Token Requests — Always Visible

The "Pending Token Requests" section is always rendered on the admin page.

- **When requests exist**: shows request cards as today
- **When empty**: shows an empty state — icon + "No pending requests. You're all caught up ✓"
- **Section header**: always shows a badge with the pending count (`0` when empty, `N` otherwise)
- The existing conditional `{tokenRequests.length > 0 || requestsLoading}` is removed

### 4.2 Admin Edit Modal

**Trigger:** "Edit" button on each user row opens a modal/drawer.

**Fields in modal:**

| Field | Editable | Notes |
|---|---|---|
| Display name | ✅ | Writes to `userProfiles/{uid}.displayName` |
| Email | ❌ (read-only) | Firebase Auth owns this — display only |
| Tokens allocated | ✅ | Integer, min 0 |
| Plan | ✅ | Dropdown: `free` / `pro` / `admin` |

**Save:** calls `adminUpdateUserProfile(uid, { displayName, tokensAllocated, plan })` — a new Firestore write helper in `firebaseWeb.ts`.

**UX:** Modal closes on save or cancel. Toast on success/failure. `fetchUsers()` re-runs after save.

### 4.3 Quick Promote / Demote Buttons

On each user row (outside the modal), alongside the Edit button:
- If user is `free` → show **"→ Pro"** button (one-click promotes without opening modal)
- If user is `pro` → show **"→ Free"** button (one-click demotes)
- Admins show no promote/demote button (already at top tier)

These call the same `adminUpdateUserProfile` helper with only the `plan` field changed.

### 4.4 New Firebase Helper

```ts
export const adminUpdateUserProfile = async (
  uid: string,
  updates: { displayName?: string; tokensAllocated?: number; plan?: 'free' | 'pro' | 'admin' }
): Promise<void>
```

Writes to `userProfiles/{uid}` via `updateDoc`. Merges with existing doc — no full overwrite.

---

## 5. Error Handling

| Scenario | Handling |
|---|---|
| Free user, server Gemini key missing | Error toast: "Service unavailable. Contact admin." — existing behaviour, no change |
| Pro user, DeepSeek key not configured | Error toast: "Pro features require DeepSeek to be configured. Contact admin." |
| Admin promotes user mid-session | Next LLM call picks up new plan — Firestore is authoritative via `assertSufficientBalance` pre-call fetch |
| Edit modal save fails (Firestore error) | Toast error, modal stays open, user can retry |
| Token request approve with 0 tokens | Frontend validation: approve button disabled if grant amount < 1 |
| `plan` missing from profile (legacy accounts) | Defaults to `'free'` in tokenContext — safe fallback |

---

## 6. Files Touched

| File | Change Type | Change |
|---|---|---|
| `src/config/llm.config.ts` | Modify | Add `tierOverrides` to `LLMTaskConfig` interface; add `tierOverrides.pro` to each task |
| `src/config/llm.config.md` | **New** | Companion config guide |
| `src/lib/llmConfigResolver.ts` | Modify | `callForTask` accepts `plan`, applies tier override resolution |
| `src/lib/tokenContext.tsx` | Modify | Expose `plan: 'free' | 'pro' | 'admin'` |
| `src/hooks/useAIService.ts` | Modify | Pass `plan` to `callForTaskBound` |
| `src/lib/firebaseWeb.ts` | Modify | Add `adminUpdateUserProfile()` |
| `src/pages/AdminPage.tsx` | Modify | Always-visible token requests; promote/demote buttons; wire Edit button to modal |
| `src/components/AdminEditModal.tsx` | **New** | Modal with name, email (read-only), tokens, plan fields |
| `docs/llm-calls-and-distributions.md` | **New** | LLM distribution table (12 task rows) |

---

## 7. Out of Scope

- Billing / payment gateway integration (plan assignment is manual via admin)
- Email notifications when plan changes
- User-facing plan display / upgrade prompts
- Rate limiting per tier (separate feature)
- Firebase Auth `displayName` sync (admin edits Firestore profile only)
