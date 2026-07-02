# LLM Calls & Distributions

This table lists every LLM call made by Resumeow-AI, which task key controls it,
where in the codebase it's triggered, and what model each user tier uses.

**How to configure:** Edit `src/config/llm.config.ts`.
- The top-level task entry (no `tierOverrides`) is the **Free tier** model.
- Add/edit `tierOverrides.pro` on a task entry to set the **Pro tier** model.
- See `src/config/llm.config.md` for a full configuration guide.
- Pre-flight token cost estimates (used to gate a call before it runs) are configured per task key in `TASK_TOKEN_MULTIPLIERS` — see `src/config/llm.config.md` § Pre-Flight Token Cost Estimates. Not duplicated into the table below to avoid two sources of truth.

---

| Feature | Task Key | Triggered From | Free Tier LLM | Pro Tier LLM | Notes |
|---|---|---|---|---|---|
| Resume LaTeX generation | `resumeLatex` | `ResumeGeneratorPage`, `OnboardingWizard` | `gemini-3.5-flash` | `deepseek-v4-pro` + thinking | Heavy — full LaTeX doc |
| Cover letter generation | `coverLetter` | `useAIService.makeWritingCall`, `ProfilePage` | `gemini-3.5-flash` | `deepseek-v4-pro` | Creative prose, temp 0.7 |
| ATS analysis | `atsAnalysis` | `useAIService.analyzeATS` | `gemini-3.5-flash` | `deepseek-v4-flash` | JSON output, temp 0 |
| Combined ATS + suggestions | `combinedATS` | `useAIService.analyzeCombinedATS`, `JDMatcherPage` | `gemini-3.5-flash` | `deepseek-v4-flash` | JSON output, temp 0 |
| Job details extraction | `extractJobDetails` | `useAIService.extractJobDetails` | `gemini-3.5-flash` | `gemini-3.5-flash` | Lightweight, max 1024 tokens |
| Job fit scoring | `jobFit` | `useAIService.analyzeJobFit`, `JDMatcherPage` | `gemini-3.5-flash` | `deepseek-v4-flash` | JSON output, temp 0 |
| Resume parsing | `resumeParse` | `ResumeGeneratorPage` (PDF upload) | `gemini-3.5-flash` | `gemini-3.5-flash` | Profile JSON extraction |
| Lazy pipeline — JD analysis | `lazyPipelineJD` | `LazyModePage` | `gemini-3.5-flash` | `deepseek-v4-pro` | Structured, long context |
| Lazy pipeline — LaTeX generation | `lazyPipelineLatex` | `LazyModePage` | `gemini-3.5-flash` | `deepseek-v4-pro` + thinking | Highest stakes generation |
| Resume scoring | `resumeScore` | `ResumeScoringPage` | `gemini-3.5-flash` | `deepseek-v4-flash` | JSON output, temp 0 |
| JD matcher | `jdMatcher` | `JDMatcherPage` | `gemini-3.5-flash` | `gemini-3.5-flash` | JSON output, temp 0 |
| Bio summary | `bioSummary` | `OnboardingWizard` (ExtrasStep) | `gemini-3.5-flash` | `gemini-3.5-flash` | Short output, max 512 tokens |
