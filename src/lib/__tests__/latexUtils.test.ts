import { cleanLatexResponse } from '../latexUtils';

describe('cleanLatexResponse', () => {
  it('strips ```latex fence', () => {
    const input = '```latex\n\\documentclass{article}\n```';
    expect(cleanLatexResponse(input)).toBe('\\documentclass{article}');
  });

  it('strips plain ``` fence', () => {
    const input = '```\n\\documentclass{article}\n```';
    expect(cleanLatexResponse(input)).toBe('\\documentclass{article}');
  });

  it('returns untouched string with no fence', () => {
    const input = '\\documentclass{article}';
    expect(cleanLatexResponse(input)).toBe('\\documentclass{article}');
  });

  it('trims leading/trailing whitespace', () => {
    expect(cleanLatexResponse('  hello  ')).toBe('hello');
  });
});
