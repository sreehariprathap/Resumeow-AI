# Resume Iteration and Profile Data Management Design

## Objective
Enable a seamless post-onboarding experience where users can iteratively edit their newly generated resume using an AI chat interface alongside a live PDF preview. Additionally, expose all deeply collected onboarding data (Experience, Education, Projects, Skills) on the Profile page for direct editing.

## Architecture & Components

### 1. Onboarding Handoff (`OnboardingWizard.tsx`)
- **Current Behavior:** Generates the resume, sets it in `sessionStorage`, and opens `PdfPreviewDialog` within the onboarding flow.
- **New Behavior:** 
  - Call `saveResume(uid, ...)` to persist the generated resume directly to Firestore.
  - Set `window.location.href = '/resume?edit=' + newResumeId` (or use React Router `navigate`) to hand off the user to the central Resume Builder page.
  - Remove the inline `PdfPreviewDialog` from `OnboardingWizard`.

### 2. Upgraded Resume Editor Modal (`ResumeEditorModal.tsx` & `ResumeGeneratorPage.tsx`)
- **Current State:** A simple dialog with an input for the name and a `<textarea>` for manual LaTeX editing.
- **New Design (Split-Screen Workspace):**
  - **Left Pane:**
    - AI Chat Input: A prompt bar to request changes (e.g., "Shorten the summary").
    - Manual Editor: A collapsible `<textarea>` for raw LaTeX tweaks.
    - Uses `callForTask('resumeLatex', prompt)` to send the modification request + current LaTeX to the LLM.
  - **Right Pane:**
    - Re-uses `PdfPreviewDialog`'s compilation logic to show a live PDF preview iframe.
    - Shows loading states during compilation or AI generation.
  - **Auto-Open:** `ResumeGeneratorPage.tsx` will parse the `?edit=ID` query parameter on mount and automatically open this upgraded editor modal for the specified resume.

### 3. Profile Page Deep Data Editing (`ProfilePage.tsx`)
- **Current State:** Only edits basic strings (Name, Phone, Location).
- **New Design:**
  - Add accordion sections or distinct cards for:
    - **Experience**
    - **Education**
    - **Projects**
    - **Skills** & **Certifications**
  - To save time and ensure consistency, we will extract the exact form components currently used inside the Onboarding wizard (`ExperienceStep.tsx`, `EducationStep.tsx`, etc.) or re-use their inner form structures if they are tightly coupled to the wizard context.
  - Users can add/remove/edit items. Changes are saved back to the `resumeProfile` document in Firestore via `saveUserData`.

## Data Flow
1. **Generation:** Profile Data -> LLM -> LaTeX -> `saveResume` -> redirect to `/resume`.
2. **Iteration:** User Chat Prompt + Current LaTeX -> LLM -> Updated LaTeX -> Recompile PDF -> Update Firestore.
3. **Profile:** Firestore `resumeProfile` -> Profile UI Forms -> `saveUserData` -> Firestore.

## Error Handling
- **Compilation Failures:** If the AI generates invalid LaTeX, the error log is shown over the PDF preview pane, and the user can chat with the AI to fix it (e.g., "Fix the compilation error").
- **LLM Failures:** Standard toast error messages.

## Implementation Steps
1. Refactor `OnboardingWizard.tsx` handoff.
2. Upgrade `ResumeEditorModal.tsx` to the split-screen view.
3. Wire URL query parsing in `ResumeGeneratorPage.tsx`.
4. Extract list-editing UI components (or build equivalents) for the Profile page.
5. Integrate deep data editing into `ProfilePage.tsx`.
