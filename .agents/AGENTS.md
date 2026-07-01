# Resumeow-AI — Project Rules

## Documentation Rule

**Always update documentation when making code changes.**

Whenever you modify, add, or remove any of the following, update the corresponding doc before committing:

| What changed | Doc to update |
|---|---|
| LLM task config (`llm.config.ts`) | `docs/llm-calls-and-distributions.md` AND `src/config/llm.config.md` |
| New API route / Firebase helper | `docs/architecture.md` (add to the data flow section) |
| New feature / page | `docs/features.md` (add a row to the feature table) |
| Environment variable added/removed | `.env.example` (keep in sync, add comment explaining purpose) |
| New component with public props | JSDoc on the component's props interface |
| Firestore collection/field added | `docs/firestore-schema.md` (add schema entry) |
| Template added/removed | `docs/llm-calls-and-distributions.md` + `src/lib/templateRegistry.ts` |

**What "update documentation" means:**
- Keep existing docs accurate — don't let them drift from the code.
- If a doc file doesn't exist yet, create it in `docs/`.
- Prefer short, scannable tables over long prose.
- Commit docs in the same commit as the code change, not separately.

**Exemptions:** Test files, internal refactors that don't change public behaviour, and pure style/lint fixes do not require doc updates.

---

## Code Style Rules

- All new files must be TypeScript — no `.js` files in `src/`.
- Use the `@/` path alias for all imports inside `src/` (never relative `../../`).
- Firestore writes must go through helper functions in `src/lib/firebaseWeb.ts` — never inline `setDoc`/`updateDoc` in components or pages.
- No `any` type except where it was pre-existing and necessary (leave a comment explaining why).
- Toast notifications use `sonner` (`import { toast } from 'sonner'`) — never `alert()`.
- Log structured data with `import { log } from '@/lib/logger'` — never raw `console.log` in production paths.

---

## LLM / AI Rules

- All LLM task configs live exclusively in `src/config/llm.config.ts`.
- Never hardcode a model name string anywhere else — always reference `MODELS.*` constants.
- Tier routing is handled by `llmConfigResolver.ts` — never manually branch on `plan` in components.
- Token deduction happens inside `useAIService` — never call `deductTokens` directly from a page or component.

---

## Commit Message Convention

```
<type>: <short description>

Types: feat | fix | docs | refactor | chore | test
```

Examples:
- `feat: add resume grid with PDF preview and duplicate flow`
- `docs: update LLM distribution table with pro tier assignments`
- `fix: Gemini key rotation fallback on 429 error`
