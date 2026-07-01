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
