import { ensureKeySkillsSuggestion } from '../atsAnalysisUtils';
import type { ATSSuggestion } from '@/hooks/useAIService';

const makeSuggestion = (overrides: Partial<ATSSuggestion> = {}): ATSSuggestion => ({
  id: 'test',
  category: 'General',
  suggestion: 'Some suggestion',
  impact: 'low',
  selected: true,
  ...overrides,
});

describe('ensureKeySkillsSuggestion', () => {
  it('prepends key-skills suggestion when none exists', () => {
    const result = ensureKeySkillsSuggestion([makeSuggestion()], 'We need Python and React developers');
    expect(result[0].id).toBe('key-skills-natural');
    expect(result[0].suggestion).toContain('python');
  });

  it('does not add duplicate when key skills suggestion already present', () => {
    const existing = makeSuggestion({ suggestion: 'Add key skills to your resume' });
    const result = ensureKeySkillsSuggestion([existing], 'some job description');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('test');
  });

  it('handles job description with no matching skills', () => {
    const result = ensureKeySkillsSuggestion([], 'We want a great person');
    expect(result[0].suggestion).toContain('key skills ');
    expect(result[0].suggestion).not.toContain('such as');
  });

  it('returns original array unchanged when essential skills suggestion present', () => {
    const existing = makeSuggestion({ suggestion: 'Include essential skills from the JD' });
    const result = ensureKeySkillsSuggestion([existing], 'java developer needed');
    expect(result).toHaveLength(1);
  });
});
