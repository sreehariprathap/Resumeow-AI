# LaTeX → PDF Pipeline

This document describes every method used in Resumeow-AI to convert a LaTeX source string into a renderable or downloadable PDF.

---

## Summary

| Method | Where used | How it works | Output | Token cost |
|---|---|---|---|---|
| **latex.ytotech.com** (server compile) | `ResumeLaTeXGenerator`, `OnboardingWizard`, `JDMatcherPage` | POST to remote `pdflatex` server, receives PDF blob | Real PDF binary — embeds in iframe or triggers download | 750 tokens flat |
| **latexonline.cc** (iframe compile) | `PDFPreviewModal` (resume library) | Passes URL-encoded LaTeX as a query param; iframe loads the compiled PDF | Rendered in browser iframe | 0 tokens (external) |
| **Overleaf** (manual export) | `ResumeLaTeXGenerator`, `PDFPreviewModal`, `TemplateDialog` | Hidden `<form>` POST to `overleaf.com/docs` with LaTeX as `snip` field | Opens Overleaf editor in new tab | 0 tokens |
| **Download .tex only** | `ResumeGeneratorPage`, `ResumeEditorModal` | `Blob` + `<a download>` — no compilation, user compiles manually | `.tex` file download | 0 tokens |

---

## Method 1 — latex.ytotech.com (Primary Server Compile)

**File:** [`src/lib/latexCompiler.ts`](../src/lib/latexCompiler.ts)

```
POST https://latex.ytotech.com/builds/sync
Content-Type: application/json

{
  "compiler": "pdflatex",
  "resources": [{ "main": true, "content": "<latex source>" }]
}

Response: application/pdf blob
```

**Used by:**

| Consumer | Trigger |
|---|---|
| [`ResumeLaTeXGenerator.tsx`](../src/components/ResumeLaTeXGenerator.tsx) | "Preview PDF" button (line ~185) and "Download PDF" button (line ~207) |
| [`OnboardingWizard.tsx`](../src/components/OnboardingWizard.tsx) | "Preview PDF" in the final onboarding step (line ~186) |
| [`JDMatcherPage.tsx`](../src/pages/JDMatcherPage.tsx) | "Preview PDF" after tailoring resume to a job description (line ~256) |

**Error handling:** Throws `LatexCompileError` (subclass of `Error`) which carries the raw compiler log in `.log`. The `PdfPreviewDialog` renders this log in a red panel so the user can debug their LaTeX.

**Token cost:** `PDF_COMPILE_TOKEN_COST = 750` characters deducted via `deductTokens`. This is not an AI call — the cost is a flat platform fee to prevent abuse.

**Helpers exported:**
- `compileLatexToPdf(latex)` → `Promise<Blob>`
- `downloadPdf(blob, filename)` → triggers browser download
- `getResumePdfFilename({ firstName, lastName, position, company })` → formatted filename string

---

## Method 2 — latexonline.cc (Iframe Embed, No Install)

**File:** [`src/components/PDFPreviewModal.tsx`](../src/components/PDFPreviewModal.tsx)

```
GET https://latexonline.cc/compile?text=<url-encoded-latex>
```

The modal builds the URL with `encodeURIComponent(latex)` and sets it as the iframe `src`. The browser streams the compiled PDF directly into the iframe.

**Trade-offs vs Method 1:**
- ✅ Zero token cost, zero backend involvement
- ✅ Works for resumes up to ~10KB of LaTeX
- ❌ Compile time is 10–30 s (vs ~5 s for ytotech)
- ❌ No error log returned — if LaTeX is invalid, iframe just shows nothing
- ❌ URL length limit (~8000 chars) can truncate very long resumes

**When to use:** The resume library grid (new feature). Chosen because the resume library doesn't charge tokens per preview — it's a library browser.

---

## Method 3 — Overleaf (Manual Export)

**Used in:** `ResumeLaTeXGenerator.tsx` (line ~411), `PDFPreviewModal.tsx` (line ~39), `TemplateDialog.tsx` (line ~120)

```html
<form method="POST" action="https://www.overleaf.com/docs" target="_blank">
  <input type="hidden" name="snip" value="<latex source>" />
</form>
```

Submitting this form opens Overleaf in a new tab with the LaTeX pre-loaded. The user clicks "Recompile" to get their PDF.

**Trade-offs:**
- ✅ Full pdflatex environment — supports every package
- ✅ User can tweak LaTeX interactively
- ❌ Requires an Overleaf account
- ❌ Not a one-click PDF download

---

## Method 4 — Raw .tex Download

**Used in:** `ResumeGeneratorPage`, `ResumeEditorModal`

```ts
const blob = new Blob([latex], { type: 'text/plain' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'resume.tex';
a.click();
```

No compilation — returns the raw LaTeX source. Intended for users who want to compile locally with TeX Live, MikTeX, or Overleaf manually.

---

## PDF Preview Component

**File:** [`src/components/PdfPreviewDialog.tsx`](../src/components/PdfPreviewDialog.tsx)

Shared dialog used by Methods 1 across `ResumeLaTeXGenerator`, `OnboardingWizard`, and `JDMatcherPage`. Accepts a `pdfBlob` prop and renders it via `URL.createObjectURL` in an iframe. Also renders the compiler error log when `compileError` is set.

---

## Decision Tree — Which Method to Use

```
Does the user need an instant, real PDF they can download?
  └─ YES → Method 1 (latex.ytotech) — costs 750 tokens
       └─ Is this in the resume library grid?
            YES → Method 2 (latexonline iframe) — free, slower

Does the user need to edit or use advanced packages?
  └─ YES → Method 3 (Overleaf)

Does the user just want the source to compile themselves?
  └─ YES → Method 4 (.tex download)
```

---

## Known Limitations & Future Work

- **Method 2 URL limit:** LaTeX > ~8KB may be silently truncated by latexonline.cc. For very long resumes, fall back to Method 1 automatically (TODO: add length guard in `PDFPreviewModal`).
- **Method 1 reliability:** latex.ytotech.com is a free community service — no SLA. If it goes down, surface a fallback message directing users to Overleaf.
- **No local compile:** All compilation is remote. A future enhancement could use WebAssembly-based pdflatex (e.g., `swiftlatex`) for fully offline compilation.
