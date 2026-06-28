const COMPILE_BASE = 'https://latexonline.cc/compile';

// latexonline.cc uses GET with ?text= query param.
// URL length limit is ~8KB in most environments; warn if content is large.
const URL_SAFE_LIMIT = 7500;

export class LatexCompileError extends Error {
  constructor(public log: string) {
    super('LaTeX compilation failed');
    this.name = 'LatexCompileError';
  }
}

export async function compileLatexToPdf(latex: string): Promise<Blob> {
  const params = new URLSearchParams({ text: latex, command: 'pdflatex' });
  const fullUrl = `${COMPILE_BASE}?${params.toString()}`;

  if (fullUrl.length > URL_SAFE_LIMIT) {
    throw new LatexCompileError(
      `LaTeX source is too large to compile via this service (${fullUrl.length} chars, limit ~${URL_SAFE_LIMIT}). Try shortening your resume content.`
    );
  }

  const response = await fetch(fullUrl);

  if (!response.ok) {
    const log = await response.text();
    throw new LatexCompileError(log);
  }

  const blob = await response.blob();
  if (!blob.type.includes('pdf')) {
    let text = `Unexpected response type: ${blob.type}`;
    try { text = await blob.text(); } catch { /* blob.text() unavailable */ }
    throw new LatexCompileError(text);
  }

  return blob;
}

export function downloadPdf(blob: Blob, filename = 'resume.pdf'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
