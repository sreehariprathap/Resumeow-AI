# Resume Template Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add resume upload + LaTeX template selection to the resume generation flow, with consistent file naming conventions for all templates.

**Architecture:** Templates live in `public/templates/resume/<firstname>/` as static assets served by Vite. A `templateRegistry.ts` config lists them. A new `TemplatePickerStep` wizard step (step 11) is inserted between Review and generation. `ResumeGeneratorPage` gains an upload sheet and template dropdown for re-generation. `generateLatexResume` gains an optional `templateTex` param and drops the "fill missing fields" AI behaviour.

**Tech Stack:** React, TypeScript, Vite (static assets in `public/`), Firebase Firestore, shadcn/ui, `pdfjs-dist`, `mammoth`, existing `resumeParser.ts` / `resumeGenerator.ts`.

## Global Constraints

- Folder and file naming: lowercase firstname only (e.g. `akshay/akshay.tex`)
- Never invent or fill missing profile fields during generation
- No new npm dependencies — reuse existing components and libs
- Don't break the existing onboarding flow for users who skip template selection

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Rename + copy | `public/templates/resume/akshay/` | Static assets: akshay.tex, akshay.pdf, akshay.jpg |
| Rename + copy | `public/templates/resume/mohamed/` | Static assets: mohamed.tex, mohamed.pdf, mohamed.jpg |
| Rename + copy | `public/templates/resume/sreehari/` | Static assets: sreehari.tex, sreehari.pdf, sreehari.jpg |
| Rename + copy | `public/templates/resume/johnsnow/` | Static assets: johnsnow.tex, johnsnow.pdf, johnsnow.jpg |
| Rename + copy | `public/templates/resume/mbzuai/` | Static assets: mbzuai.tex, mbzuai.pdf, mbzuai.jpg |
| Create | `src/lib/templateRegistry.ts` | Typed list of available templates with id/label/previewUrl/texUrl |
| Modify | `src/lib/resumeGenerator.ts` | Add `templateTex?: string` param; update AI prompt |
| Create | `src/components/onboarding/steps/TemplatePickerStep.tsx` | Template card grid, selection state |
| Modify | `src/components/OnboardingWizard.tsx` | Add step 11, TOTAL_STEPS → 12, pass template to handleGenerate |
| Modify | `src/pages/ResumeGeneratorPage.tsx` | Upload sheet + template dropdown for re-generation |

---

### Task 1: Rename templates + copy to public/

**Files:**
- Rename: `templates/resume/Akshay Vaishnav's CV/` → `templates/resume/akshay/`
- Rename: `templates/resume/Mohamed Javid's Résumé/` → `templates/resume/mohamed/`
- Rename: `templates/resume/Sreehari Prathap/` → `templates/resume/sreehari/`
- Rename: `templates/resume/MBZUAI Resume Template/` → `templates/resume/mbzuai/`
- Copy: `templates/resume/` → `public/templates/resume/`

- [ ] **Step 1: Rename source folders and files to firstname convention**

```bash
cd /path/to/project/templates/resume

# Akshay
mv "Akshay Vaishnav's CV" akshay
mv "akshay/Akshay Vaishnav.tex" akshay/akshay.tex
mv "akshay/Akshay Vaishnav.pdf" akshay/akshay.pdf
mv "akshay/3981.jpg" akshay/akshay.jpg

# Mohamed
mv "Mohamed Javid's Résumé" mohamed
mv "mohamed/Mohamed Javid.tex" mohamed/mohamed.tex
mv "mohamed/Mohamed Javid.pdf" mohamed/mohamed.pdf
mv "mohamed/4329.jpg" mohamed/mohamed.jpg

# Sreehari
mv "sreehari.png" sreehari/sreehari.jpg   # inside Sreehari Prathap/
# (folder already named sreehari after previous rename)

# MBZUAI
mv "MBZUAI Resume Template" mbzuai
mv "mbzuai/MBZUAI Resume Template.tex" mbzuai/mbzuai.tex
# rename pdf and jpg similarly
```

- [ ] **Step 2: Copy all templates into public/templates/resume/**

```bash
cp -r templates/resume public/templates/
```

- [ ] **Step 3: Verify static URLs work**

Start dev server (`npm run dev`), visit:
`http://localhost:5173/templates/resume/akshay/akshay.jpg`
Expected: image loads.

- [ ] **Step 4: Commit**

```bash
git add templates/resume public/templates
git commit -m "chore: rename templates to firstname convention, copy to public/"
```

---

### Task 2: Template registry

**Files:**
- Create: `src/lib/templateRegistry.ts`

**Interfaces:**
- Produces: `ResumeTemplate` type + `RESUME_TEMPLATES: ResumeTemplate[]` used by `TemplatePickerStep` and `ResumeGeneratorPage`

- [ ] **Step 1: Create `src/lib/templateRegistry.ts`**

```ts
export interface ResumeTemplate {
  id: string;
  label: string;
  previewUrl: string;
  texUrl: string;
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'sreehari',
    label: 'Sreehari',
    previewUrl: '/templates/resume/sreehari/sreehari.jpg',
    texUrl: '/templates/resume/sreehari/sreehari.tex',
  },
  {
    id: 'akshay',
    label: 'Akshay',
    previewUrl: '/templates/resume/akshay/akshay.jpg',
    texUrl: '/templates/resume/akshay/akshay.tex',
  },
  {
    id: 'mohamed',
    label: 'Mohamed',
    previewUrl: '/templates/resume/mohamed/mohamed.jpg',
    texUrl: '/templates/resume/mohamed/mohamed.tex',
  },
  {
    id: 'johnsnow',
    label: 'John Snow',
    previewUrl: '/templates/resume/johnsnow/johnsnow.jpg',
    texUrl: '/templates/resume/johnsnow/johnsnow.tex',
  },
  {
    id: 'mbzuai',
    label: 'MBZUAI',
    previewUrl: '/templates/resume/mbzuai/mbzuai.jpg',
    texUrl: '/templates/resume/mbzuai/mbzuai.tex',
  },
];

export async function fetchTemplateTex(texUrl: string): Promise<string> {
  const res = await fetch(texUrl);
  if (!res.ok) throw new Error(`Failed to load template: ${texUrl}`);
  return res.text();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/templateRegistry.ts
git commit -m "feat: add template registry with 5 resume templates"
```

---

### Task 3: Update `generateLatexResume` — template support + no missing fields

**Files:**
- Modify: `src/lib/resumeGenerator.ts`

**Interfaces:**
- Consumes: `ResumeProfile` (unchanged), new optional `templateTex?: string`
- Produces: `generateLatexResume(profile, makeAICall, templateTex?)` — same return type `Promise<string>`

- [ ] **Step 1: Rewrite `src/lib/resumeGenerator.ts`**

```ts
import type { ResumeProfile } from '@/types/resumeProfile';

export const generateLatexResume = async (
  profile: ResumeProfile,
  makeAICall: (prompt: string) => Promise<string>,
  templateTex?: string
): Promise<string> => {
  const basePrompt = templateTex
    ? `You are a professional resume writer. Fill in the user's data into the provided LaTeX resume template.

TEMPLATE (keep all LaTeX structure, packages, and formatting exactly as-is):
${templateTex}

USER DATA:
${JSON.stringify(profile, null, 2)}

INSTRUCTIONS:
1. Replace the personal details, experiences, education, projects, skills, and certifications in the template with the user's data
2. CRITICAL: Only include sections and fields the user has provided — do NOT invent, guess, or fill missing fields
3. If the user has no data for a section (e.g. no projects), remove that section entirely
4. Preserve all LaTeX commands, packages, and document structure from the template
5. Enhance bullet points: make them stronger, start with action verbs
6. Format dates as in the template (match its date format)
7. Output ONLY the raw LaTeX code, no markdown fences, no explanation

Generate the complete filled LaTeX document now:`
    : `You are a professional resume writer. Generate a complete, ready-to-compile LaTeX resume using the Jake's Resume template format.

PROFILE DATA:
${JSON.stringify(profile, null, 2)}

INSTRUCTIONS:
1. Use the Jake's Resume LaTeX template structure (include all required packages and formatting)
2. Enhance bullet points: make them stronger, start with action verbs, add metrics/impact where logical
3. CRITICAL: Only include sections and fields explicitly provided — do NOT invent or fill missing fields
4. If a section is empty or missing, omit it entirely from the output
5. Order sections: Summary (only if provided) → Experience → Education → Projects (if any) → Certifications → Skills → Extras
6. Format dates properly (e.g., "March 2022 -- June 2024")
7. Keep the LaTeX clean and compilable — use only standard packages (fontenc, geometry, hyperref, titlesec, enumitem, multicol)
8. Output ONLY the raw LaTeX code, no markdown fences, no explanation

Generate the complete LaTeX document now:`;

  const latex = await makeAICall(basePrompt);
  return latex;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/resumeGenerator.ts
git commit -m "feat: generateLatexResume accepts templateTex, never fills missing fields"
```

---

### Task 4: `TemplatePickerStep` component

**Files:**
- Create: `src/components/onboarding/steps/TemplatePickerStep.tsx`

**Interfaces:**
- Consumes: `RESUME_TEMPLATES` from `templateRegistry.ts`
- Produces: `TemplatePickerStep({ selectedId, onSelect, onNext, onBack })` — `onSelect` receives `ResumeTemplate`

- [ ] **Step 1: Create `TemplatePickerStep.tsx`**

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { RESUME_TEMPLATES } from '@/lib/templateRegistry';
import type { ResumeTemplate } from '@/lib/templateRegistry';

interface TemplatePickerStepProps {
  selectedId: string | null;
  onSelect: (template: ResumeTemplate) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TemplatePickerStep({ selectedId, onSelect, onNext, onBack }: TemplatePickerStepProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Choose a template</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Your content will be placed into this structure. Only your provided details will be used.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {RESUME_TEMPLATES.map((t) => {
          const isSelected = selectedId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              className={`relative rounded-lg border-2 overflow-hidden transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? 'border-primary shadow-md'
                  : hovered === t.id
                  ? 'border-muted-foreground/40'
                  : 'border-border'
              }`}
            >
              <img
                src={t.previewUrl}
                alt={t.label}
                className="w-full aspect-[3/4] object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-resume.png';
                }}
              />
              <div className="p-2 text-xs font-medium text-center truncate">{t.label}</div>
              {isSelected && (
                <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5 text-primary-foreground">
                  <CheckCircle className="h-4 w-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} disabled={!selectedId} className="flex-1">
          Generate Resume
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/onboarding/steps/TemplatePickerStep.tsx
git commit -m "feat: add TemplatePickerStep component"
```

---

### Task 5: Wire `TemplatePickerStep` into `OnboardingWizard`

**Files:**
- Modify: `src/components/OnboardingWizard.tsx`

**Interfaces:**
- Consumes: `TemplatePickerStep`, `fetchTemplateTex`, `ResumeTemplate` from `templateRegistry.ts`
- Produces: wizard now has 12 steps; step 11 = template picker; `handleGenerate` receives `templateTex`

- [ ] **Step 1: Update imports in `OnboardingWizard.tsx`**

Add:
```ts
import { TemplatePickerStep } from './onboarding/steps/TemplatePickerStep';
import { RESUME_TEMPLATES, fetchTemplateTex } from '@/lib/templateRegistry';
import type { ResumeTemplate } from '@/lib/templateRegistry';
```

- [ ] **Step 2: Add template state and update constants**

Change `TOTAL_STEPS` from `11` to `12`.

Add to `STEP_LABELS`:
```ts
const STEP_LABELS = [
  'Welcome',
  'Personal Info',
  'Domain',
  'Target Roles',
  'Experience',
  'Education',
  'Projects',
  'Certifications',
  'Skills',
  'Extras',
  'Review & Generate',
  'Choose Template',   // ← new
];
```

Add state after existing `useState` declarations:
```ts
const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>(RESUME_TEMPLATES[0]);
```

- [ ] **Step 3: Update `handleGenerate` to fetch template and pass it**

Replace the existing `handleGenerate` body with:
```ts
const handleGenerate = async () => {
  setIsGenerating(true);
  try {
    const templateTex = await fetchTemplateTex(selectedTemplate.texUrl);
    const latex = await generateLatexResume(profile as ResumeProfile, makeAICall, templateTex);
    setGeneratedLatex(latex);

    const finalProfile = {
      ...profile,
      completedAt: Date.now(),
      lastUpdated: Date.now(),
      currentStep: TOTAL_STEPS,
      skippedSteps: Array.from(skippedSteps),
    };

    if (currentUser) {
      await saveUserData(currentUser.uid, 'resumeProfile', finalProfile as Record<string, unknown>);
    }

    sessionStorage.setItem('generatedLatex', latex);
    sessionStorage.setItem('selectedTemplateId', selectedTemplate.id);
    completeOnboarding();
    onComplete?.();

    setPdfBlob(null);
    setCompileError(null);
    setIsCompiling(true);
    setIsPdfOpen(true);
    try {
      const blob = await compileLatexToPdf(latex);
      setPdfBlob(blob);
    } catch (compileErr) {
      const log = compileErr instanceof LatexCompileError ? compileErr.log : String(compileErr);
      setCompileError(log);
      toast.error('PDF preview unavailable — you can still download the .tex file on the resume page.');
    } finally {
      setIsCompiling(false);
    }
  } catch (err) {
    console.error(err);
    toast.error('Resume generation failed. Please try again.');
  } finally {
    setIsGenerating(false);
  }
};
```

- [ ] **Step 4: Remove the Generate button from ReviewStep and wire step 11**

In ReviewStep (step 10) the `onGenerate` prop currently triggers generation directly. Instead it should call `goNext()` to advance to step 11. Update the step 10 JSX:
```tsx
{step === 10 && (
  <ReviewStep
    data={profile}
    onBack={goBack}
    onGenerate={() => goNext()}   // ← advances to template picker
    onSkipToFinish={handleSkipToFinish}
    isGenerating={isGenerating}
    onEditStep={handleEditFromReview}
    skippedSteps={skippedSteps}
  />
)}
```

Add step 11 JSX after step 10 block:
```tsx
{step === 11 && (
  <TemplatePickerStep
    selectedId={selectedTemplate.id}
    onSelect={setSelectedTemplate}
    onNext={handleGenerate}
    onBack={goBack}
  />
)}
```

- [ ] **Step 5: Update `returnToReview` to still target step 10**

`returnToReview` already calls `setStep(10)` — no change needed.

- [ ] **Step 6: Commit**

```bash
git add src/components/OnboardingWizard.tsx
git commit -m "feat: insert TemplatePickerStep as step 11 in onboarding wizard"
```

---

### Task 6: Upload + template dropdown on `ResumeGeneratorPage`

**Files:**
- Modify: `src/pages/ResumeGeneratorPage.tsx`

**Interfaces:**
- Consumes: `ResumeDropzone`, `extractTextFromFile`, `parseResumeWithAI`, `mapParsedToProfile` from existing libs
- Consumes: `RESUME_TEMPLATES`, `fetchTemplateTex` from `templateRegistry.ts`
- Consumes: `generateLatexResume` (updated signature with `templateTex?`)
- Consumes: `saveUserData` from `firebaseWeb.ts`

- [ ] **Step 1: Add imports**

Add to existing imports in `ResumeGeneratorPage.tsx`:
```ts
import { useState as _useState } from 'react'; // already imported
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { ResumeDropzone } from '@/components/ResumeDropzone';
import { extractTextFromFile, parseResumeWithAI, mapParsedToProfile } from '@/lib/resumeParser';
import { useAIProvider } from '@/lib/aiProviderContext';
import { saveUserData } from '@/lib/firebaseWeb';
import { RESUME_TEMPLATES, fetchTemplateTex } from '@/lib/templateRegistry';
```

- [ ] **Step 2: Add upload and template state**

Add inside `ResumeGeneratorPage` component after existing state:
```ts
const { makeAICall } = useAIProvider();
const [uploadOpen, setUploadOpen] = useState(false);
const [isUploading, setIsUploading] = useState(false);
const [uploadError, setUploadError] = useState<string | null>(null);
const [uploadSummary, setUploadSummary] = useState<{ experiences: number; education: number; skills: number } | null>(null);
const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
  () => sessionStorage.getItem('selectedTemplateId') ?? RESUME_TEMPLATES[0].id
);
```

Note: `useAIProvider` is already imported — just add the destructure if not present.

- [ ] **Step 3: Add upload handler**

Add inside the component:
```ts
const handleUploadFile = async (file: File) => {
  if (file.size > 5 * 1024 * 1024) {
    setUploadError('File too large. Use a file under 5MB.');
    return;
  }
  setIsUploading(true);
  setUploadError(null);
  setUploadSummary(null);
  try {
    const text = await extractTextFromFile(file);
    const parsedData = await parseResumeWithAI(text, makeAICall);
    const mapped = mapParsedToProfile(parsedData);
    setUploadSummary({
      experiences: parsedData.experiences.length,
      education: parsedData.education.length,
      skills: parsedData.skills.length,
    });
    const updated = { ...profile, ...mapped };
    setProfile(updated as ResumeProfile);
    if (currentUser) {
      await saveUserData(currentUser.uid, 'resumeProfile', updated as Record<string, unknown>);
    }
  } catch (err) {
    setUploadError(err instanceof Error ? err.message : 'Parsing failed.');
  } finally {
    setIsUploading(false);
  }
};
```

- [ ] **Step 4: Update `handleRegenerate` to use selected template**

Replace existing `handleRegenerate`:
```ts
const handleRegenerate = async () => {
  if (!profile) {
    toast.error('No profile loaded. Please edit your profile first.');
    return;
  }
  setIsRegenerating(true);
  try {
    const template = RESUME_TEMPLATES.find((t) => t.id === selectedTemplateId);
    const templateTex = template ? await fetchTemplateTex(template.texUrl) : undefined;
    const newLatex = await generateLatexResume(profile, makeAICall, templateTex);
    setLatex(newLatex);
    sessionStorage.setItem('generatedLatex', newLatex);
    sessionStorage.setItem('selectedTemplateId', selectedTemplateId);
    toast.success('Resume regenerated!');
  } catch {
    toast.error('Regeneration failed. Check your AI settings.');
  } finally {
    setIsRegenerating(false);
  }
};
```

- [ ] **Step 5: Add Upload Sheet and Template Select to the action bar**

In the JSX action buttons `<div className="flex flex-wrap gap-2">`, add after existing buttons:

```tsx
{/* Template selector */}
<Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
  <SelectTrigger className="w-40 h-9 text-sm">
    <SelectValue placeholder="Template" />
  </SelectTrigger>
  <SelectContent>
    {RESUME_TEMPLATES.map((t) => (
      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
    ))}
  </SelectContent>
</Select>

{/* Upload sheet */}
<Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
  <SheetTrigger asChild>
    <Button variant="outline" className="gap-2">
      <Upload className="h-4 w-4" /> Upload Resume
    </Button>
  </SheetTrigger>
  <SheetContent side="right" className="w-full sm:max-w-md">
    <SheetHeader>
      <SheetTitle>Upload Resume</SheetTitle>
    </SheetHeader>
    <div className="mt-6">
      <ResumeDropzone
        onFile={handleUploadFile}
        isLoading={isUploading}
        parsedSummary={uploadSummary}
        error={uploadError}
        onContinue={() => setUploadOpen(false)}
      />
    </div>
  </SheetContent>
</Sheet>
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/ResumeGeneratorPage.tsx
git commit -m "feat: add upload sheet and template dropdown to ResumeGeneratorPage"
```

---

## Self-Review

**Spec coverage:**
- ✅ File naming convention (Task 1)
- ✅ Parse uploaded resume (Tasks 2, 6)
- ✅ Template picker in wizard (Tasks 4, 5)
- ✅ Template dropdown on generator page (Task 6)
- ✅ Don't fill missing fields (Task 3)
- ✅ Templates served as static assets (Task 1, 2)

**Placeholder scan:** None found. All steps contain concrete code.

**Type consistency:**
- `ResumeTemplate` defined in Task 2, consumed in Tasks 4, 5, 6 ✅
- `fetchTemplateTex(texUrl: string): Promise<string>` defined Task 2, used Tasks 5, 6 ✅
- `generateLatexResume(profile, makeAICall, templateTex?)` updated Task 3, consumed Tasks 5, 6 ✅
- `RESUME_TEMPLATES[0].id` default in Task 6 matches registry in Task 2 ✅
