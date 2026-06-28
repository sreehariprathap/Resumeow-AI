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

  it('POSTs to latex.ytotech.com with JSON body', async () => {
    const mockBlob = new Blob(['%PDF'], { type: 'application/pdf' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    await compileLatexToPdf(SAMPLE_LATEX);

    const [calledUrl, calledOptions] = (global.fetch as jest.Mock).mock.calls[0];
    expect(calledUrl).toBe('https://latex.ytotech.com/builds/sync');
    expect(calledOptions.method).toBe('POST');
    expect(calledOptions.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(calledOptions.body);
    expect(body.compiler).toBe('pdflatex');
    expect(body.resources[0].main).toBe(true);
    expect(body.resources[0].content).toBe(SAMPLE_LATEX);
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
