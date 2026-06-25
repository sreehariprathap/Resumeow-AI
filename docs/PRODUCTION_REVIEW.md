# Production Review Report — Resumeow AI

**Date:** 2026-06-24  
**Target scale:** 1–10 real users  
**Reviewed by:** Automated audit agent

---

## Summary

The app is a React + Firebase + AI SPA for resume/cover-letter generation. It has a solid feature set and good retry/fallback patterns for Firebase. However, several issues block production safety. The most critical is a **broken authentication gate** that lets all unauthenticated users bypass login entirely. API keys are stored in `localStorage` in plain text. There is no React Error Boundary. Console.log calls number 154 in production code.

| Severity | Count |
|---|---|
| Critical | 3 |
| High | 6 |
| Medium | 7 |
| Low / Nice-to-have | 6 |
| Dead code to remove | 7 |

---

## Critical Issues

### 1. Authentication Gate is Completely Bypassed

**File:** `src/AuthWrapper.tsx:13–23`

```tsx
const isPrivacyPage = "https://github.com/..."  // always truthy string
if (isPrivacyPage) {
  return (
    <>
      <WebHeader />
      <div className="container py-8">{children}</div>  // App rendered!
      <WebFooter />
    </>
  );
}
```

A non-empty string is always truthy in JavaScript. Every user hits the `if (isPrivacyPage)` branch and gets the full app rendered immediately. The `isLoading` check and `!isAuthenticated` redirect **never execute**. The app is completely open without login.

**Fix:** Use `window.location.pathname` to detect the privacy route, or remove the bypass entirely if there is no `/privacy` route in the router. The privacy policy link is external (GitHub),πen so there is no in-app privacy page to protect.

```tsx
// Replace lines 12-23 with:
if (isLoading) { ... }
if (!isAuthenticated) { return <AuthScreen />; }
return <><WebHeader /><div>{children}</div><WebFooter /></>;
```

---

### 2. API Keys Stored in Plain-Text localStorage

**Files:** `src/lib/aiProviderContext.tsx:278,293,309`, `src/components/SettingsDialog.tsx:94,192,195`

`deepseekApiKey`, `openRouterApiKey`, and `geminiApiKey` are all written unencrypted to `localStorage` under keys like `user_${uid}_deepseekApiKey`. Anyone with DevTools access (or a malicious browser extension) can trivially read these keys.

**Fix:** For a 1–10 user personal-use app, acceptable mitigations are:
1. **Minimum:** Warn users in the UI that keys are stored locally and to use keys with spend limits set.
2. **Better:** Store keys only in Firebase (already done for primary storage) and do NOT cache to `localStorage`. The app already loads from Firebase on login — the localStorage caching is redundant.
3. **Best (not required at this scale):** Run AI calls through a small backend proxy that holds the API key server-side.

---

### 3. No React Error Boundary

**File:** `src/main.tsx` — no `<ErrorBoundary>` anywhere in the component tree.

Any unhandled JavaScript exception in any component causes the **entire app to crash to a blank screen** with no recovery path for the user. This is unacceptable for real users.

**Fix:** Add a minimal error boundary wrapping `<App />`:

```tsx
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">Please refresh the page.</p>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Then in `main.tsx`, wrap the app:
```tsx
<ErrorBoundary>
  <AuthProvider>
    ...
  </AuthProvider>
</ErrorBoundary>
```

---

## High Priority Issues

### 4. DeepSeek Provider Added but `callAI` Still Falls Through for Unknown Providers

**File:** `src/lib/aiProviderContext.tsx:348–405`

The `callAI` function now handles `deepseek`, `openrouter`, and `gemini`. However, the DeepSeek branch was added **after** a linter modification that also kept the old fallback `throw new Error('Unsupported AI provider')`. The system-reminder shows the file was modified, but the `callAI` function's `deepseek` branch is present. **Verify** that `else { throw new Error(...) }` at line ~404 is the true final fallback and not an intermediate branch that silently skips DeepSeek.

Additionally, the `makeAICall` fallback logic picks `AVAILABLE_MODELS.find(m => m.provider !== primaryModel.provider)` — with 3 providers now (deepseek/openrouter/gemini), this may pick the wrong fallback (e.g., OpenRouter when Gemini would be better). The fallback should prefer the model the user configured a key for.

**Fix:** Change fallback selection to:
```tsx
const fallbackModel = AVAILABLE_MODELS.find(
  m => m.provider !== primaryModel.provider && (
    (m.provider === 'deepseek' && deepseekApiKey) ||
    (m.provider === 'openrouter' && openRouterApiKey) ||
    (m.provider === 'gemini' && geminiApiKey)
  )
);
```

---

### 5. SettingsDialog Does Not Show/Save DeepSeek API Key Field in UI

**File:** `src/components/SettingsDialog.tsx:149–215`

`handleSaveSettings` saves `googleApiKey` and `openRouterApiKey` to Firebase but the `deepseekApiKey` (now the **primary provider**) is not saved through the same code path. The `setDeepseekApiKey` from context is destructured at line 45 but the save path in `handleSaveSettings` must be audited to confirm it calls `setDeepseekApiKey(localDeepseekApiKey)`.

Also verify the JSX in the Settings dialog has an `<Input>` field for the DeepSeek key and that it pre-populates from the context value.

**Fix:** Ensure the settings save path calls `await setDeepseekApiKey(localDeepseekApiKey)` alongside the other keys, and confirm the UI field exists.

---

### 6. Unsafe JSON.parse Without Try/Catch in localStorage Reads

**File:** `src/hooks/useTemplates.ts:163,179,195`

```ts
setResumeTemplates(JSON.parse(savedResumeTemplates));     // line 163
setCoverLetterTemplates(JSON.parse(savedCoverLetterTemplates)); // line 179
setCustomPrompts(JSON.parse(savedCustomPrompts));           // line 195
```

If localStorage contains corrupted JSON (browser crash mid-write, storage extension interference), these lines throw synchronously and crash the entire hook, losing all template state. The outer `loadFromLocalStorage` has a catch, but these functions (`loadResumeTemplatesFromLocalStorage`, etc.) are called independently too.

**Fix:**
```ts
try {
  setResumeTemplates(JSON.parse(savedResumeTemplates));
} catch {
  setResumeTemplates(DEFAULT_RESUME_TEMPLATES);
}
```

---

### 7. `pendingSaveRef` Race Condition Drops Saves

**File:** `src/hooks/useTemplates.ts:110–152`

```ts
const saveToFirebase = useCallback(async (retryCount = 0) => {
  if (!currentUser || pendingSaveRef.current) return; // ← early return if busy
  pendingSaveRef.current = true;
  ...
  } finally {
    pendingSaveRef.current = false;
  }
}, [...]);
```

If a save is in-progress and the user makes another template change, the debounced save at line 394 triggers `saveToFirebase` which early-returns. The updated data is **never saved to Firebase** until the next change. This is a silent data loss path.

**Fix:** Use a queued/dirty-flag approach instead:
```ts
const hasPendingDataRef = useRef(false);
// On save complete, if hasPendingDataRef.current, trigger another save.
```

---

### 8. Two Firebase Initializations — `firebase.ts` and `firebaseWeb.ts`

**Files:** `src/lib/firebase.ts`, `src/lib/firebaseWeb.ts`

Both files call `initializeApp(firebaseConfig)` with identical config. The Firebase SDK de-duplicates apps by name, so the second call hits the default app. However, calling `initializeApp` twice for the same default app may throw `FirebaseError: Firebase App named '[DEFAULT]' already exists` in some Firebase SDK versions, or silently reuse the first instance creating confusion.

`aiProviderContext.tsx` imports from `./firebase` while `authContext.tsx` and `onboardingContext.tsx` import from `./firebaseWeb`. Both should use one canonical module.

**Fix:** Delete `src/lib/firebase.ts`. Have `aiProviderContext.tsx` import `{ getUserData, saveUserData }` from `./firebaseWeb` instead.

---

### 9. 154 `console.log`/`console.error` Calls in Production Code

**Files:** Distributed across all source files.

These log internal state, user IDs, API keys (indirectly via data objects), and Firebase responses to the browser console in production. For a real-user product, this is a data exposure and professionalism concern.

**Fix:** Either:
1. Strip logs in production build using Vite's `esbuild.drop: ['console', 'debugger']` option in `vite.config.ts`.
2. Or replace with the existing `dataPersistenceLogger` which already gates by level.

```ts
// vite.config.ts → build section:
esbuild: {
  drop: import.meta.env.MODE === 'production' ? ['console', 'debugger'] : [],
}
```

---

## Medium Priority Issues

### 10. `CombinedATSAnalysis` Auto-Runs on Every Keystroke (Expensive)

**File:** `src/components/CombinedATSAnalysis.tsx:64–69`

```tsx
useEffect(() => {
  if (jobDescription && resumeContent && !disabled && !analysisComplete) {
    performCombinedAnalysis();
  }
}, [jobDescription, resumeContent, disabled, analysisComplete]);
```

`jobDescription` and `resumeContent` change with every keystroke in the parent. This will fire the expensive AI call (consuming DeepSeek/OpenRouter credits) after every character typed. `analysisComplete` prevents re-runs only until the user makes any change — the flag is never reset to `false` when inputs change.

**Fix:** Debounce the inputs in `App.tsx` before passing to `CombinedATSAnalysis`, and reset `analysisComplete` when job description or resume change:
```tsx
useEffect(() => {
  setAnalysisComplete(false);
}, [jobDescription, resumeContent]);
```

---

### 11. `useTemplates` Calls `saveToFirebase` on Every Render After Load

**File:** `src/hooks/useTemplates.ts:370–398`

The combined save effect depends on `[resumeTemplates, coverLetterTemplates, customPrompts, currentUser, saveToLocalStorage, saveToFirebase]`. `saveToLocalStorage` and `saveToFirebase` are `useCallback` with the same arrays in their deps, so they re-create on every template change — which is fine. But the effect also creates an emergency backup on **every save**, even for non-mutating re-renders. For 500ms debounced Firebase saves this is tolerable, but the emergency backup runs synchronously before the debounce, triggering localStorage writes on every change.

**Fix:** Only create emergency backup when data actually mutates (compare prev vs current), not on every effect run.

---

### 12. `usePromptGenerator` Calls `useTemplates` — Double Hook Instance

**File:** `src/hooks/usePromptGenerator.ts:6`

```ts
const { resumeTemplates, coverLetterTemplates, getActivePrompt } = useTemplates();
```

`useTemplates` is a stateful hook that loads from Firebase and manages sync. `App.tsx` also calls `useTemplates()` (line 45). These are **two separate hook instances** — two separate React states, two Firebase loads, two localStorage sync operations. If one updates, the other doesn't know.

**Fix:** Lift `useTemplates` to a context (similar to `AIProviderProvider`) so there's one instance. Or pass `resumeTemplates`, `coverLetterTemplates`, and `getActivePrompt` as props to `usePromptGenerator`.

---

### 13. `ATSScore` Interface Defined Twice

**Files:** `src/App.tsx:32–41` and `src/hooks/useAIService.ts:15–24`

Two identical `ATSScore` interface definitions. `App.tsx` defines its own local copy instead of importing from `useAIService.ts`.

**Fix:** Remove the duplicate in `App.tsx` and import from `useAIService`:
```ts
import type { ATSScore } from '@/hooks/useAIService';
```

---

### 14. `vite.config.ts` — No Code Splitting, Single Large Bundle

**File:** `vite.config.ts:43`

```ts
manualChunks: undefined
```

With Firebase (~200KB), OpenAI SDK (~80KB), `@google/genai` (~100KB), and `react-router-dom` (~30KB) all in one bundle, the initial load will be 500KB+. For a web app with real users, this causes slow initial load.

**Fix:**
```ts
manualChunks: {
  firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
  ai: ['openai', '@google/genai'],
  vendor: ['react', 'react-dom', 'react-router-dom'],
}
```

---

### 15. `styled-components` in Bundle for One Component

**File:** `src/components/ui/Loader.tsx:1`

`styled-components` (~70KB gzipped) is imported for a single `Loader` component. The `Loader` is not imported anywhere in the app (orphaned), but `styled-components` is in `package.json` `dependencies` and gets bundled.

**Fix:** Remove the `Loader.tsx` component and `styled-components` from `package.json`. Use a Tailwind spinner if needed.

---

### 16. `useAIProvider` — `isLoading` Never Becomes `true` on Logout/Re-login

**File:** `src/lib/aiProviderContext.tsx`

`isLoading` is only set to `false` in the `finally` block of `loadSettings`. On user change (logout then login), the provider resets state but **never sets `isLoading` back to `true`** before starting the next `loadSettings` call. This means the AI provider selector shows a fully-loaded (possibly stale) state briefly before the new user's settings arrive.

**Fix:** Set `setIsLoading(true)` at the start of the `loadSettings` function, or inside the `currentUser` change `useEffect` before the async call.

---

## Low Priority / Nice-to-Have

### 17. No Input Sanitization on AI Prompts

Job description and resume content are inserted raw into prompts. For a personal-use app with trusted users this is fine, but resume content containing `{JOB_DESCRIPTION}` as a literal string would cause placeholder logic to recurse. The current regex replacement approach handles this correctly, but consider trimming extremely long inputs (>50,000 chars) before sending to prevent very expensive AI API calls.

---

### 18. `AuthContext` Default Values Throw on Misuse

**File:** `src/lib/authContext.tsx:26–35`

Default context values for `loginWithEmail`, `registerWithEmail`, `resetPassword`, `logout` throw `new Error("Not implemented")`. These throw synchronously if any component calls auth methods outside an `AuthProvider`. Since `AuthProvider` is always at root, this is safe — but a warning-only default (or null-check) would be more graceful.

---

### 19. `useRequireAuth` Hook Does Nothing

**File:** `src/lib/authContext.tsx:136–147`

```ts
export const useRequireAuth = () => {
  const auth = useAuth();
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      console.log("Authentication required"); // ← just logs, no redirect
    }
  }, [...]);
  return auth;
};
```

This hook is exported but the only action on failed auth is a `console.log`. It's not used anywhere in the app. Either implement actual redirect logic or delete it.

---

### 20. `firebase.ts` Has Dead Extension Auth Code

**File:** `src/lib/firebase.ts:52–99`

`signInWithChromeIdentity` and `isExtensionContext` both hardcode `return false`. The Chrome identity OAuth flow (lines 62–98) is dead code that can never be reached. `logOut` also has dead Chrome token revocation logic (lines 139–155).

This is addressed in the dead code section below.

---

### 21. Missing `deepseekApiKey` in `.env.example`

**File:** `.env.example`

The example environment file references a `VITE_GEMINI_API_KEY` that is not actually used (Gemini key is entered through the UI/Firebase, not env). The new DeepSeek setup should be documented. Update `.env.example` to clarify what's needed:

```
# Note: AI API keys (DeepSeek, OpenRouter, Gemini) are entered in the app's Settings UI
# and stored in Firebase — they are NOT environment variables.
```

---

### 22. No Firestore Security Rules Audit

**File:** Firebase Console (not in codebase)

Firestore security rules are not visible in this codebase. Verify the rules enforce `allow read, write: if request.auth.uid == userId;` on `users/{userId}/**` documents. Without this, any authenticated user can read/write any other user's templates and API keys.

---

## Dead Code to Remove

| File | Reason |
|---|---|
| `src/components/CombinedATSAnalysis_new.tsx` | Identical to `CombinedATSAnalysis.tsx` (diff shows 0 differences). Delete. |
| `src/components/ATSInsights.tsx` | Not imported anywhere in the app. Orphaned (219 lines). |
| `src/components/ui/Loader.tsx` | Not imported anywhere. Uses `styled-components` unnecessarily. |
| `src/components/TestPage.tsx` | Commented out in `main.tsx`. Not used. |
| `src/lib/firebase.ts` | Superseded by `firebaseWeb.ts`. Should be consolidated — `aiProviderContext.tsx` should import from `firebaseWeb.ts`. After migration, delete `firebase.ts`. |
| `src/extension.tsx` + `src/ExtensionAuthWrapper.tsx` + `src/components/ExtensionAuthScreen.tsx` | Extension code that `isExtensionContext()` hardcodes to `false`. Dead for the web app. Only keep if actively maintaining an extension build. |
| `src/lib/authContext.tsx` — `useRequireAuth` export | Unused hook with placeholder body. Remove. |

---

## Quick-Fix Priority Order

Fix in this order before going live:

1. **AuthWrapper bypass** (Critical #1) — 5-minute fix, unblocks all auth security
2. **Error Boundary** (Critical #3) — 20-minute fix, prevents blank screen crashes
3. **Duplicate Firebase init** (High #8) — 10-minute refactor to one module
4. **DeepSeek key save path in SettingsDialog** (High #5) — verify and fix
5. **JSON.parse without try/catch** (High #6) — 10-minute fix
6. **Strip console.logs from production** (High #9) — 2-line Vite config change
7. **CombinedATSAnalysis debounce** (Medium #10) — prevents credit burning on keystrokes
8. **Dead code removal** — reduces bundle size and confusion
