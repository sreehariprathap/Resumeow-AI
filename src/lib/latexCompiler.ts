const COMPILE_URL = 'https://latex.ytotech.com/builds/sync';

export class LatexCompileError extends Error {
  constructor(public log: string) {
    super('LaTeX compilation failed');
    this.name = 'LatexCompileError';
  }
}

export async function compileLatexToPdf(latex: string): Promise<Blob> {
  const response = await fetch(COMPILE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler: 'pdflatex',
      resources: [{ main: true, content: latex }],
    }),
  });

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
