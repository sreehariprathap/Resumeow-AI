# LaTeX → PDF In-App Compilation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compile LaTeX resumes to PDF inside the app via latexonline.cc, replacing the Overleaf redirect with in-app preview and direct download.

**Architecture:** POST the cleaned LaTeX source to `https://latexonline.cc/compile` (CORS-enabled, no backend needed), receive a PDF blob, show it in an `<iframe>` dialog, and let the user download it — all client-side. The existing `cleanLatexResponse` utility handles fence-stripping before submission.

**Tech Stack:** TypeScript fetch API, Blob/Object URLs, shadcn/ui Dialog + iframe, existing `cleanLatexResponse` from `src/lib/latexUtils.ts`.

## Global Constraints

- No new npm packages — use native fetch + Blob APIs + existing shadcn components
- TypeScript strict mode — no `any`, explicit return types on all exported functions
- Match existing component patterns: shadcn/ui, sonner toasts, lucide-react icons
- Test file naming: `src/lib/__tests__/<name>.test.ts`, run with `npx jest <pattern>`
- `cleanLatexResponse` from `@/lib/latexUtils` must be applied before sending to the API

---

### Task 1: latexCompiler utility

**Files:**
- Create: `src/lib/latexCompiler.ts`
- Create: `src/lib/__tests__/latexCompiler.test.ts`

**Interfaces:**
- Produces:
  - `class LatexCompileError extends Error { log: string }`
  - `compileLatexToPdf(latex: string): Promise<Blob>` — returns PDF blob
  - `downloadPdf(blob: Blob, filename?: string): void` — triggers browser download

---

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/latexCompiler.test.ts`:

```typescript
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

  it('POSTs to latexonline.cc with url-encoded body', async () => {
    const mockBlob = new Blob(['%PDF'], { type: 'application/pdf' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    await compileLatexToPdf(SAMPLE_LATEX);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://latexonline.cc/compile',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    );
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
```

- [ ] **Step 2: Run tests — verify they all fail**

```bash
npx jest latexCompiler
```

Expected: FAIL — `Cannot find module '../latexCompiler'`

- [ ] **Step 3: Implement `src/lib/latexCompiler.ts`**

```typescript
const COMPILE_URL = 'https://latexonline.cc/compile';

export class LatexCompileError extends Error {
  constructor(public log: string) {
    super('LaTeX compilation failed');
    this.name = 'LatexCompileError';
  }
}

export async function compileLatexToPdf(latex: string): Promise<Blob> {
  const response = await fetch(COMPILE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: latex }).toString(),
  });

  if (!response.ok) {
    const log = await response.text();
    throw new LatexCompileError(log);
  }

  const blob = await response.blob();
  if (!blob.type.includes('pdf')) {
    const text = await blob.text();
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
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npx jest latexCompiler
```

Expected: 6 tests pass, 0 failed.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/lib/latexCompiler.ts src/lib/__tests__/latexCompiler.test.ts
git commit -m "feat: add latexCompiler utility — compile LaTeX to PDF via latexonline.cc"
```

---

### Task 2: PdfPreviewDialog component

**Files:**
- Create: `src/components/PdfPreviewDialog.tsx`

**Interfaces:**
- Consumes: `downloadPdf(blob: Blob, filename?: string): void` from `@/lib/latexCompiler`
- Produces:
  ```typescript
  interface PdfPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pdfBlob: Blob | null;
    isCompiling: boolean;
    compileError: string | null;
    onDownload: () => void;
  }
  export const PdfPreviewDialog: React.FC<PdfPreviewDialogProps>
  ```

---

- [ ] **Step 1: Create `src/components/PdfPreviewDialog.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Download, Loader2, AlertCircle } from 'lucide-react';

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob | null;
  isCompiling: boolean;
  compileError: string | null;
  onDownload: () => void;
}

export const PdfPreviewDialog = ({
  open,
  onOpenChange,
  pdfBlob,
  isCompiling,
  compileError,
  onDownload,
}: PdfPreviewDialogProps) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfBlob) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(pdfBlob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdfBlob]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-base">PDF Preview</DialogTitle>
          {pdfBlob && (
            <Button size="sm" onClick={onDownload} className="gap-2 mr-8">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 p-4">
          {isCompiling && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Compiling LaTeX — this takes ~5 seconds…</p>
            </div>
          )}

          {compileError && !isCompiling && (
            <div className="h-full overflow-auto p-4 bg-destructive/10 border border-destructive/20 rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm font-medium text-destructive">Compilation failed</p>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {compileError}
              </pre>
            </div>
          )}

          {objectUrl && !isCompiling && (
            <iframe
              src={objectUrl}
              className="w-full h-full rounded-md border"
              title="Resume PDF Preview"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/components/PdfPreviewDialog.tsx
git commit -m "feat: add PdfPreviewDialog — iframe-based in-app PDF viewer"
```

---

### Task 3: Wire compilation into ResumeLaTeXGenerator

**Files:**
- Modify: `src/components/ResumeLaTeXGenerator.tsx`

**Interfaces:**
- Consumes:
  - `compileLatexToPdf(latex: string): Promise<Blob>` from `@/lib/latexCompiler`
  - `downloadPdf(blob: Blob, filename?: string): void` from `@/lib/latexCompiler`
  - `LatexCompileError` from `@/lib/latexCompiler`
  - `PdfPreviewDialog` from `./PdfPreviewDialog`
  - `cleanLatexResponse` from `@/lib/latexUtils` (already imported)

---

- [ ] **Step 1: Add imports to `ResumeLaTeXGenerator.tsx`**

At the top of the file, after the existing imports, add:

```typescript
import { compileLatexToPdf, downloadPdf, LatexCompileError } from '@/lib/latexCompiler';
import { PdfPreviewDialog } from './PdfPreviewDialog';
import { FilePdf } from 'lucide-react'; // already have lucide imported — add FilePdf to the existing import
```

Update the existing lucide import line from:
```typescript
import { Clipboard, Download, FileEdit, Save, FileCode, RefreshCw, AlertCircle } from 'lucide-react';
```
to:
```typescript
import { Clipboard, Download, FileEdit, Save, FileCode, RefreshCw, AlertCircle, FileDown } from 'lucide-react';
```

- [ ] **Step 2: Add PDF state inside the component**

Inside `ResumeLaTeXGenerator`, after the existing state declarations (after `const [editedLatex, setEditedLatex] = useState...`), add:

```typescript
const [isPdfOpen, setIsPdfOpen] = useState(false);
const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
const [isCompiling, setIsCompiling] = useState(false);
const [compileError, setCompileError] = useState<string | null>(null);
```

- [ ] **Step 3: Add `compileAndPreview` and `handleDownloadPdf` handlers**

After the existing `downloadAsTex` function, add:

```typescript
const compileAndPreview = async () => {
  if (!generatedLatex) return;
  const cleaned = cleanLatexResponse(generatedLatex);
  setPdfBlob(null);
  setCompileError(null);
  setIsPdfOpen(true);
  setIsCompiling(true);
  try {
    const blob = await compileLatexToPdf(cleaned);
    setPdfBlob(blob);
  } catch (err) {
    const log = err instanceof LatexCompileError ? err.log : String(err);
    setCompileError(log);
    toast.error('Compilation failed — see error log in preview.');
  } finally {
    setIsCompiling(false);
  }
};

const handleDownloadPdf = async () => {
  if (pdfBlob) {
    downloadPdf(pdfBlob);
    toast.success('PDF downloaded!');
    return;
  }
  if (!generatedLatex) return;
  const cleaned = cleanLatexResponse(generatedLatex);
  setIsCompiling(true);
  try {
    const blob = await compileLatexToPdf(cleaned);
    setPdfBlob(blob);
    downloadPdf(blob);
    toast.success('PDF downloaded!');
  } catch (err) {
    toast.error('PDF compilation failed. Try "Open in Overleaf" instead.');
  } finally {
    setIsCompiling(false);
  }
};
```

- [ ] **Step 4: Add the two new buttons in the JSX**

Find the existing button group (the `<div className="flex gap-2">` that contains Copy / Edit / Download .tex / Open in Overleaf buttons).

Add these two buttons **before** the "Open in Overleaf" button:

```tsx
<Button
  variant="outline"
  onClick={compileAndPreview}
  disabled={isCompiling}
  className="h-8 text-sm"
  size="sm"
>
  {isCompiling
    ? <><RefreshCw className="h-4 w-4 md:mr-2 animate-spin" /><span className="hidden md:inline">Compiling…</span></>
    : <><FileDown className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Preview PDF</span></>
  }
</Button>
<Button
  variant="outline"
  onClick={handleDownloadPdf}
  disabled={isCompiling}
  className="h-8 text-sm"
  size="sm"
>
  <FileDown className="h-4 w-4 md:mr-2" />
  <span className="hidden md:inline">Download PDF</span>
</Button>
```

- [ ] **Step 5: Mount PdfPreviewDialog at the bottom of the component return**

Just before the closing `</>` of the component return (after the hidden Overleaf `<form>`), add:

```tsx
<PdfPreviewDialog
  open={isPdfOpen}
  onOpenChange={setIsPdfOpen}
  pdfBlob={pdfBlob}
  isCompiling={isCompiling}
  compileError={compileError}
  onDownload={handleDownloadPdf}
/>
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 7: Run full test suite**

```bash
npx jest
```

Expected: all existing tests pass (45+), latexCompiler tests pass.

- [ ] **Step 8: Manual smoke test**

1. Start dev server: `npx vite`
2. Log in, generate a LaTeX resume
3. Click **Preview PDF** — dialog opens, "Compiling…" spinner appears, PDF renders in iframe after ~5 seconds
4. Click **Download PDF** inside dialog — PDF file downloads
5. Click **Download PDF** button on the card (outside dialog) — compiles and downloads directly
6. Test with intentionally broken LaTeX (delete `\end{document}`) — error log appears in dialog

- [ ] **Step 9: Commit**

```bash
git add src/components/ResumeLaTeXGenerator.tsx
git commit -m "feat: in-app PDF compile + preview via latexonline.cc — replaces Overleaf redirect"
```
