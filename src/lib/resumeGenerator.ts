import type { ResumeProfile } from '@/types/resumeProfile';

export const generateLatexResume = async (
  profile: ResumeProfile,
  makeAICall: (prompt: string) => Promise<string>,
  templateTex?: string
): Promise<string> => {
  const prompt = templateTex
    ? `You are a professional resume writer. Fill in the user's data into the provided LaTeX resume template.

TEMPLATE (preserve all LaTeX structure, packages, and formatting exactly):
${templateTex}

USER DATA:
${JSON.stringify(profile, null, 2)}

INSTRUCTIONS:
1. Replace the personal details, experiences, education, projects, skills, and certifications in the template with the user's data
2. CRITICAL: Only include sections and fields the user has explicitly provided — do NOT invent, guess, or fill missing fields
3. If the user has no data for a section (e.g. no projects), remove that section entirely from the output
4. Preserve all LaTeX commands, packages, and document structure from the template
5. Enhance bullet points: make them stronger, start with action verbs
6. Match the date format used in the template
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

  const latex = await makeAICall(prompt);
  return latex;
};
