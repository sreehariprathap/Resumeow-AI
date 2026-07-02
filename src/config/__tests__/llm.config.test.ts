import { estimateTokensForTask, TASK_TOKEN_MULTIPLIERS, DEFAULT_TOKEN_MULTIPLIER } from '../llm.config';

describe('estimateTokensForTask', () => {
  it('applies the resumeLatex multiplier to prompt length', () => {
    const promptChars = 3000;
    const expected = Math.max(1, Math.ceil((promptChars * TASK_TOKEN_MULTIPLIERS.resumeLatex) / 750));
    expect(estimateTokensForTask('resumeLatex', promptChars)).toBe(expected);
  });

  it('applies a smaller multiplier for extractJobDetails than resumeLatex', () => {
    const promptChars = 3000;
    expect(estimateTokensForTask('extractJobDetails', promptChars)).toBeLessThan(
      estimateTokensForTask('resumeLatex', promptChars)
    );
  });

  it('falls back to DEFAULT_TOKEN_MULTIPLIER when taskKey is undefined', () => {
    const promptChars = 3000;
    const expected = Math.max(1, Math.ceil((promptChars * DEFAULT_TOKEN_MULTIPLIER) / 750));
    expect(estimateTokensForTask(undefined, promptChars)).toBe(expected);
  });

  it('never returns less than 1', () => {
    expect(estimateTokensForTask('jobFit', 1)).toBeGreaterThanOrEqual(1);
  });
});
