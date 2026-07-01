# Data and State Management Design Spec

## Overview
This specification addresses critical security vulnerabilities, billing integrity issues, and performance bottlenecks in the Resumeow-AI web application's data and state management layers.

## Architecture

### 1. Firebase Cloud Functions (Backend)
To secure API keys and ensure atomic token deduction, we are migrating AI calls to a serverless backend.
- **`proxyLLMCall` Function:** An `onCall` Cloud Function that acts as a secure proxy between the client and AI providers (DeepSeek, Gemini).
- **Secure Secrets:** API keys currently stored as `VITE_` variables in `.env` will be moved to Firebase Secret Manager.
- **Atomic Billing:** Before making the LLM call, the function will use a Firestore Transaction to read the user's `tokensRemaining`, verify sufficient funds, and deduct the cost. 

### 2. Firestore Security Rules
With token deduction moved to the backend, the client no longer needs write access to sensitive fields.
- **`users/{uid}` Document:** 
  - `allow read: if request.auth.uid == uid;`
  - `allow write: if request.auth.uid == uid && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['tokensRemaining', 'tokensUsed', 'isAdmin', 'plan']);`
- **Subcollections (`resumes`, `templates`, etc.):** Remain user-writable as they contain user-generated content, not billing/auth state.

### 3. Context Provider Optimization
- **`TokenContext` & `AIProviderContext`:** Refactor to use `useMemo` for the context value object and `useCallback` for all exported functions (`deductTokens`, `makeAICall`, etc.).
- **Impact:** Prevents cascading re-renders across the entire React tree when a context's internal state updates.

## Data Flow
1. User clicks "Generate Resume".
2. Client-side `useAIService` calls the Firebase Function `proxyLLMCall` with the prompt and requested model tier.
3. Firebase Function authenticates the request using the provided auth token context.
4. Function runs a Firestore Transaction:
   - Reads `users/{uid}`.
   - Checks `tokensRemaining >= requiredTokens`.
   - Deducts `requiredTokens`.
5. Function calls DeepSeek/Gemini using the secure API key.
6. Function returns the generated content to the client.

## Scope & Implementation Notes
This spec focuses exclusively on the backend migration of AI calls and state optimization. The frontend routing and component refactoring (`App.tsx`) is explicitly out of scope for this phase and will be addressed in a subsequent spec.
