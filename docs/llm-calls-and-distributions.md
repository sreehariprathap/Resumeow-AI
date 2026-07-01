# LLM Calls & Distributions

This table lists every LLM call made by Resumeow-AI, which task key controls it,
where in the codebase it's triggered, and what model each user tier uses.

**How to configure:** Edit `src/config/llm.config.ts`.
- The top-level task entry (no `tierOverrides`) is the **Free tier** model.
- Add/edit `tierOverrides.pro` on a task entry to set the **Pro tier** model.
- See `src/config/llm.config.md` for a full configuration guide.

---

<table>
  <thead>
    <tr>
      <th>Feature</th>
      <th>Task Key</th>
      <th>Triggered From</th>
      <th>Free Tier LLM</th>
      <th>Pro Tier LLM</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Resume LaTeX generation</td>
      <td><code>resumeLatex</code></td>
      <td><code>ResumeGeneratorPage</code>, <code>OnboardingWizard</code></td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure in llm.config.ts)</em></td>
      <td>Heavy — full LaTeX doc</td>
    </tr>
    <tr>
      <td>Cover letter generation</td>
      <td><code>coverLetter</code></td>
      <td><code>useAIService.makeWritingCall</code></td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure)</em></td>
      <td>Creative prose, temp 0.7</td>
    </tr>
    <tr>
      <td>ATS analysis</td>
      <td><code>atsAnalysis</code></td>
      <td><code>useAIService.analyzeATS</code></td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure)</em></td>
      <td>JSON output, temp 0</td>
    </tr>
    <tr>
      <td>Combined ATS + suggestions</td>
      <td><code>combinedATS</code></td>
      <td><code>useAIService.analyzeCombinedATS</code>, <code>JDMatcherPage</code></td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure)</em></td>
      <td>JSON output, temp 0</td>
    </tr>
    <tr>
      <td>Job details extraction</td>
      <td><code>extractJobDetails</code></td>
      <td><code>useAIService.extractJobDetails</code></td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure)</em></td>
      <td>Lightweight, max 1024 tokens</td>
    </tr>
    <tr>
      <td>Job fit scoring</td>
      <td><code>jobFit</code></td>
      <td><code>useAIService.analyzeJobFit</code>, <code>JDMatcherPage</code></td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure)</em></td>
      <td>JSON output, temp 0</td>
    </tr>
    <tr>
      <td>Resume parsing</td>
      <td><code>resumeParse</code></td>
      <td><code>ResumeGeneratorPage</code> (PDF upload)</td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure)</em></td>
      <td>Profile JSON extraction</td>
    </tr>
    <tr>
      <td>Lazy pipeline — JD analysis</td>
      <td><code>lazyPipelineJD</code></td>
      <td><code>LazyModePage</code></td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure)</em></td>
      <td>Structured, long context</td>
    </tr>
    <tr>
      <td>Lazy pipeline — LaTeX generation</td>
      <td><code>lazyPipelineLatex</code></td>
      <td><code>LazyModePage</code></td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure)</em></td>
      <td>Thinking enabled, max 16384</td>
    </tr>
    <tr>
      <td>Resume scoring</td>
      <td><code>resumeScore</code></td>
      <td><code>ResumeScoringPage</code></td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure)</em></td>
      <td>JSON output, temp 0</td>
    </tr>
    <tr>
      <td>JD matcher</td>
      <td><code>jdMatcher</code></td>
      <td><code>JDMatcherPage</code></td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure)</em></td>
      <td>JSON output, temp 0</td>
    </tr>
    <tr>
      <td>Bio summary</td>
      <td><code>bioSummary</code></td>
      <td><code>OnboardingWizard</code> (ExtrasStep)</td>
      <td><code>gemini-3.5-flash</code></td>
      <td><em>(configure)</em></td>
      <td>Short output, max 512 tokens</td>
    </tr>
  </tbody>
</table>
