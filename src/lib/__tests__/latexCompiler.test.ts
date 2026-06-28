/**
 * @jest-environment jsdom
 */
import { compileLatexToPdf, downloadPdf, LatexCompileError } from '../latexCompiler';

const SAMPLE_LATEX = '\\documentclass{article}\\begin{document}Hello\\end{document}';

describe('compileLatexToPdf', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('returns a PDF blob when compilation succeeds', async () => {
    const mockBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const result = await compileLatexToPdf(SAMPLE_LATEX);
    expect(result.type).toBe('application/pdf');
  });

  it('GETs latexonline.cc with text and command query params', async () => {
    const mockBlob = new Blob(['%PDF'], { type: 'application/pdf' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    await compileLatexToPdf(SAMPLE_LATEX);

    const calledUrl: string = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain('https://latexonline.cc/compile');
    expect(calledUrl).toContain('text=');
    expect(calledUrl).toContain('command=pdflatex');
    // Should be a GET — no second argument (options object) or no method override
    const calledOptions = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(calledOptions).toBeUndefined();
  });

  it('throws LatexCompileError when LaTeX source exceeds URL safe limit', async () => {
    const hugeLaTeX = 'x'.repeat(8000);
    await expect(compileLatexToPdf(hugeLaTeX)).rejects.toBeInstanceOf(LatexCompileError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws LatexCompileError on non-200 response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('! LaTeX Error: undefined control sequence'),
    });

    await expect(compileLatexToPdf('bad latex')).rejects.toBeInstanceOf(LatexCompileError);
  });

  it('LatexCompileError carries the server log text', async () => {
    const logText = '! LaTeX Error: undefined control sequence';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve(logText),
    });

    try {
      await compileLatexToPdf('bad latex');
    } catch (err) {
      expect(err).toBeInstanceOf(LatexCompileError);
      expect((err as LatexCompileError).log).toBe(logText);
    }
  });

  it('throws LatexCompileError when response is not a PDF blob', async () => {
    const errorBlob = new Blob(['compilation error text'], { type: 'text/plain' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(errorBlob),
    });

    await expect(compileLatexToPdf('bad latex')).rejects.toBeInstanceOf(LatexCompileError);
  });
});

describe('downloadPdf', () => {
  it('creates an anchor with download attribute and clicks it', () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    const createObjectURL = jest.fn(() => 'blob:fake-url');
    const revokeObjectURL = jest.fn();
    const click = jest.fn();

    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    const anchor = { href: '', download: '', click, remove: jest.fn() } as unknown as HTMLAnchorElement;
    jest.spyOn(document, 'createElement').mockReturnValueOnce(anchor);
    jest.spyOn(document.body, 'appendChild').mockImplementationOnce(() => anchor);
    jest.spyOn(document.body, 'removeChild').mockImplementationOnce(() => anchor);

    downloadPdf(blob, 'my-resume.pdf');

    expect(anchor.download).toBe('my-resume.pdf');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });
});
