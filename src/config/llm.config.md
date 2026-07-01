# llm.config.ts — Configuration Guide

This file is the **single source of truth** for every LLM call in Resumeow-AI.
Edit `llm.config.ts` (same folder) to change which model handles any feature, for any user tier.

---

## Quick Reference: Available Models

```ts
import { MODELS } from './llm.config';

MODELS.gemini.flash   // 'gemini-3.5-flash'   — fast, cheap    → Free tier default
MODELS.gemini.pro     // 'gemini-3.0-pro'      — higher quality, built-in reasoning
MODELS.deepseek.flash // 'deepseek-v4-flash'   — fast, cheap    → Pro lightweight tasks
MODELS.deepseek.pro   // 'deepseek-v4-pro'     — best quality, supports thinking mode
```

---

## How Tier Routing Works

Every task has a base config (the **free tier** model). To give pro users a different
model, add a `tierOverrides.pro` block to the task entry:

```ts
resumeLatex: {
  model:     MODELS.gemini.flash,   // ← Free tier uses this
  provider:  'gemini',
  maxTokens: 16384,

  tierOverrides: {
    pro: {
      model:    MODELS.deepseek.pro,  // ← Pro tier uses this instead
      provider: 'deepseek',
      thinking: true,                 // ← And enables chain-of-thought
    }
  }
}
```

Fields **not** listed in `tierOverrides.pro` inherit from the task-level base config.
For example, if you only override `model` and `provider`, `maxTokens` stays at 16384.

**Admin tier** is routed identically to **pro** unless you add a separate
`tierOverrides.admin` block (rarely needed).

---

## Field Reference

| Field | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | `gemini-3.5-flash` | Exact API model ID sent to the provider |
| `provider` | `'gemini' \| 'deepseek' \| 'openrouter'` | `'gemini'` | Which provider API to call |
| `temperature` | `number` | `0.3` | `0` = deterministic (JSON tasks). `0.7+` = creative (writing tasks) |
| `thinking` | `boolean` | `false` | Chain-of-thought reasoning. Supported on `deepseek-v4-pro` and Gemini 2.5+. Costs 2–5× more — use sparingly. |
| `maxTokens` | `number` | `8192` | Caps output length. Too low = truncated responses. Increase for LaTeX tasks. |
| `concurrency` | `number` | `1` | Max parallel calls for this task (rarely needs changing). |
| `systemPrompt` | `string` | `''` | Injected on every call. Counts as input tokens — keep short. |
| `tierOverrides` | `object` | — | Keys: `'free' \| 'pro' \| 'admin'`. Fields here replace task-level values for that tier. |

---

## Common Recipes

### Upgrade a task to DeepSeek Flash for Pro users

```ts
resumeScore: {
  model:       MODELS.gemini.flash,  // free unchanged
  provider:    'gemini',
  temperature: 0,
  tierOverrides: {
    pro: { model: MODELS.deepseek.flash, provider: 'deepseek' }
  },
},
```

### Enable thinking mode for Pro on heavy generation

```ts
lazyPipelineLatex: {
  model:     MODELS.gemini.flash,    // free
  provider:  'gemini',
  maxTokens: 16384,
  tierOverrides: {
    pro: {
      model:    MODELS.deepseek.pro,
      provider: 'deepseek',
      thinking: true,
    }
  },
},
```

### Give Pro a higher token cap on the same model

```ts
coverLetter: {
  model:       MODELS.gemini.flash,
  provider:    'gemini',
  temperature: 0.7,
  maxTokens:   4096,
  tierOverrides: {
    pro: { maxTokens: 8192 }   // same model, just more tokens
  },
},
```

---

## Adding a New Task

1. Add the task key to the `LLMTaskKey` union type in `llm.config.ts`.
2. Add an entry to `llmConfig.tasks` with at minimum `model` and `provider`.
3. Add a row to `docs/llm-calls-and-distributions.md`.
4. Call it with `callForTask('yourNewKey', prompt)` in `useAIService.ts`.

---

## Cost Notes

- `thinking: true` on DeepSeek Pro bills reasoning tokens **separately** at 2–5× output rate.
- Only enable `thinking` for the heaviest generation tasks (full resume LaTeX, lazy pipeline LaTeX).
- DeepSeek Flash ≈ Gemini Flash in cost — safe swap for lightweight tasks.
- Use `maxTokens` conservatively on extraction tasks — JSON rarely needs more than 2048 tokens.
- `temperature: 0` is mandatory for any task that outputs JSON (prevents stochastic formatting breaks).
