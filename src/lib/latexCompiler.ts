const COMPILE_URL = 'https://latex.ytotech.com/builds/sync';

export class LatexCompileError extends Error {
  log: string;
  constructor(log: string) {
    super('LaTeX compilation failed');
    this.name = 'LatexCompileError';
    this.log = log;
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

/** Flat token cost charged per PDF compilation (external API call). */
export const PDF_COMPILE_TOKEN_COST = 750; // 1 token at 750-chars-per-token rate

/**
 * Build a clean PDF filename from profile fields.
 * Format: FirstName_LastName_YYYY-MM-DD[_Position].pdf
 * Falls back gracefully when fields are empty.
 */
function slugify(s: string): string {
  return s.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function getResumePdfFilename(opts: {
  firstName?: string;
  lastName?: string;
  position?: string;
  company?: string;
}): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const parts: string[] = [];

  const first = opts.firstName ? slugify(opts.firstName) : '';
  const last = opts.lastName ? slugify(opts.lastName) : '';
  const pos = opts.position ? slugify(opts.position) : '';
  const co = opts.company ? slugify(opts.company) : '';

  if (first) parts.push(first);
  if (last) parts.push(last);
  parts.push(date);
  if (pos) parts.push(pos);
  if (co) parts.push(co);

  return `${parts.join('_')}.pdf`;
}
