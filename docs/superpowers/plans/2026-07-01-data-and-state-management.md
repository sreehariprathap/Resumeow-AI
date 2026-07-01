# Data and State Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure AI calls by moving them to Firebase Cloud Functions and lock down Firestore billing records.

**Architecture:** We will create a `proxyLLMCall` Firebase Function to act as a secure proxy between the client and LLMs. The function will deduct tokens in an atomic Firestore transaction. We will lock down `firestore.rules` so clients cannot edit their token balance, and we will memoize context providers to stop excessive React re-renders.

**Tech Stack:** Firebase Functions (Node.js), TypeScript, React Context.

## Global Constraints

- No `any` type except where pre-existing and necessary.
- Firestore writes must go through helper functions.
- All new files must be TypeScript.

---

### Task 1: Setup Firebase Functions

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/src/index.ts`
- Modify: `firebase.json:1-10`

**Interfaces:**
- Consumes: N/A
- Produces: A deployable Firebase Functions environment.

- [ ] **Step 1: Create functions package.json and tsconfig**

Run the following commands to set up the basic directory:

```bash
mkdir -p functions/src
cat << 'EOF' > functions/package.json
{
  "name": "functions",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  },
  "engines": {
    "node": "20"
  },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^12.1.0",
    "firebase-functions": "^5.0.1",
    "@google/genai": "^0.1.2",
    "openai": "^4.20.1"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.0.0"
  },
  "private": true
}
EOF

cat << 'EOF' > functions/tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2017"
  },
  "compileOnSave": true,
  "include": [
    "src"
  ]
}
EOF
```

- [ ] **Step 2: Install dependencies**

```bash
cd functions && npm install
```

- [ ] **Step 3: Create stub index.ts**

```typescript
// functions/src/index.ts
import * as admin from "firebase-admin";
admin.initializeApp();
```

- [ ] **Step 4: Update firebase.json**

```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        "*.local"
      ],
      "predeploy": [
        "npm --prefix \"$RESOURCE_DIR\" run build"
      ]
    }
  ],
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add functions/ firebase.json
git commit -m "chore: setup firebase functions environment"
```

### Task 2: Implement proxyLLMCall Function

**Files:**
- Modify: `functions/src/index.ts`

**Interfaces:**
- Consumes: Client request with `prompt` and `modelTier`
- Produces: `proxyLLMCall` Firebase onCall function.

- [ ] **Step 1: Write proxyLLMCall implementation**

Update `functions/src/index.ts` to include the callable function.

```typescript
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";

admin.initializeApp();
const db = admin.firestore();

// Ensure these secrets are set in Firebase Secret Manager:
// firebase functions:secrets:set DEEPSEEK_API_KEY
// firebase functions:secrets:set GEMINI_API_KEY
const deepseekSecret = functions.defineSecret("DEEPSEEK_API_KEY");
const geminiSecret = functions.defineSecret("GEMINI_API_KEY");

export const proxyLLMCall = functions
  .runWith({ secrets: [deepseekSecret, geminiSecret] })
  .https.onCall(async (data, context) => {
    // 1. Verify Auth
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }
    const uid = context.auth.uid;

    const { prompt, modelTier = "flash" } = data;
    if (!prompt || typeof prompt !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Missing prompt.");
    }

    // 2. Token Check & Deduction (Atomic Transaction)
    // Estimate tokens (1 token ~ 4 chars for simplicity in this basic check)
    const estimatedCost = Math.max(1, Math.ceil(prompt.length / 750));
    
    await db.runTransaction(async (t) => {
      const profileRef = db.collection("userProfiles").doc(uid);
      const docSnap = await t.get(profileRef);
      if (!docSnap.exists) {
        throw new functions.https.HttpsError("not-found", "User profile not found.");
      }
      
      const profile = docSnap.data()!;
      const remaining = profile.tokensRemaining || 0;
      
      if (remaining < estimatedCost) {
        throw new functions.https.HttpsError("resource-exhausted", "Insufficient tokens.");
      }
      
      t.update(profileRef, {
        tokensRemaining: admin.firestore.FieldValue.increment(-estimatedCost),
        tokensUsed: admin.firestore.FieldValue.increment(estimatedCost),
        lastActiveAt: Date.now()
      });
    });

    // 3. Make LLM Call
    try {
      if (modelTier === "pro") {
        const openai = new OpenAI({
          apiKey: deepseekSecret.value(),
          baseURL: "https://api.deepseek.com",
        });
        const response = await openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
        });
        return { text: response.choices[0]?.message?.content || "" };
      } else {
        const ai = new GoogleGenAI({ apiKey: geminiSecret.value() });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        return { text: response.text || "" };
      }
    } catch (error) {
      console.error("LLM Call failed", error);
      throw new functions.https.HttpsError("internal", "LLM request failed.");
    }
});
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: implement proxyLLMCall cloud function with atomic token deduction"
```

### Task 3: Refactor Frontend `useAIService`

**Files:**
- Modify: `src/hooks/useAIService.ts`
- Modify: `src/lib/firebaseWeb.ts`

**Interfaces:**
- Consumes: `proxyLLMCall` via Firebase SDK
- Produces: Cleaned up client AI hook that delegates to the backend.

- [ ] **Step 1: Add firebase/functions to initialization**

Modify `src/lib/firebaseWeb.ts`:
Add `import { getFunctions } from "firebase/functions";` at the top.
Export `export const functionsInstance = getFunctions(app);` at the bottom of the initialization block.

- [ ] **Step 2: Refactor useAIService**

Modify `src/hooks/useAIService.ts`. Remove the direct AI calls and double billing logic (`void deductTokens(...)`), and replace with calling the cloud function.

```typescript
// Inside useAIService.ts, add imports:
import { httpsCallable } from "firebase/functions";
import { functionsInstance } from "@/lib/firebaseWeb";

// Replace the makeAICallWithModel logic with a single call to the backend:
const callBackendAI = async (prompt: string, tier: 'flash' | 'pro' | 'pro-thinking') => {
  const proxyLLMCall = httpsCallable(functionsInstance, 'proxyLLMCall');
  try {
    const result = await proxyLLMCall({ prompt, modelTier: tier });
    return (result.data as { text: string }).text;
  } catch (error) {
    log.error("Backend LLM call failed", error);
    throw error;
  }
};
```
*(The implementer must remove the local token deduction calls `deductTokens` since the backend handles it now).*

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAIService.ts src/lib/firebaseWeb.ts
git commit -m "refactor: move AI calls to Firebase backend in useAIService"
```

### Task 4: Update Firestore Security Rules

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: N/A
- Produces: Hardened security rules.

- [ ] **Step 1: Modify firestore.rules**

In `firestore.rules`, update the `userProfiles` rule so users can read, but cannot modify sensitive billing fields. Ensure you overwrite the old permissive rule:

```javascript
    match /userProfiles/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && get(/databases/$(database)/documents/userProfiles/$(request.auth.uid)).data.isAdmin == true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/userProfiles/$(request.auth.uid)).data.isAdmin == true;
      
      // Allow user to create their own profile, or update it IF they don't touch tokens/plan/isAdmin
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId 
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['tokensAllocated', 'tokensRemaining', 'tokensUsed', 'plan', 'isAdmin']);
    }
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "chore: secure userProfiles rules against client manipulation"
```

### Task 5: Optimize Context Providers

**Files:**
- Modify: `src/lib/tokenContext.tsx`
- Modify: `src/lib/aiProviderContext.tsx`

**Interfaces:**
- Consumes: N/A
- Produces: Memoized React Contexts to prevent re-renders.

- [ ] **Step 1: Refactor TokenContext**

Modify `src/lib/tokenContext.tsx`. Ensure all functions are wrapped in `useCallback` and the value is wrapped in `useMemo`:

```tsx
  const deduct = useCallback(async (amount: number) => {
    // ... existing logic ...
  }, [currentUser]);

  const refill = useCallback(async () => {
    // ... existing logic ...
  }, [currentUser]);
  
  const refreshBalance = useCallback(async () => {
    // ... existing logic ...
  }, [currentUser]);

  const value = useMemo(() => ({
    balance,
    deduct,
    refill,
    refreshBalance
  }), [balance, deduct, refill, refreshBalance]);

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
```

- [ ] **Step 2: Refactor AIProviderContext**

Modify `src/lib/aiProviderContext.tsx`. Wrap the value in `useMemo` and functions in `useCallback`:

```tsx
  const makeAICall = useCallback(async (...) => { ... }, [...deps]);
  const makeAICallWithModel = useCallback(async (...) => { ... }, [...deps]);
  
  const value = useMemo(() => ({
    activeProvider,
    setActiveProvider,
    keys,
    setKey,
    makeAICall,
    makeAICallWithModel,
    makeAICallWithThinking
  }), [activeProvider, keys, makeAICall, makeAICallWithModel, makeAICallWithThinking]);

  return (
    <AIProviderContext.Provider value={value}>
      {children}
    </AIProviderContext.Provider>
  );
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/tokenContext.tsx src/lib/aiProviderContext.tsx
git commit -m "perf: memoize context providers to prevent excessive re-renders"
```
