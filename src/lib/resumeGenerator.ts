import type { ResumeProfile } from '@/types/resumeProfile';

export const generateLatexResume = async (
  profile: ResumeProfile,
  makeAICall: (prompt: string) => Promise<string>
): Promise<string> => {
  const prompt = `You are a professional resume writer. Generate a complete, ready-to-compile LaTeX resume using the Jake's Resume template format.

PROFILE DATA:
${JSON.stringify(profile, null, 2)}

INSTRUCTIONS:
1. Use the Jake's Resume LaTeX template structure (include all required packages and formatting)
2. Enhance bullet points: make them stronger, start with action verbs, add metrics/impact where logical
3. If no professional summary provided, write one (2-3 sentences) based on their experience and target roles
4. Order sections: Summary → Experience → Education → Projects (if any) → Certifications → Skills → Extras
5. Format dates properly (e.g., "March 2022 -- June 2024")
6. Keep the LaTeX clean and compilable — use only standard packages (fontenc, geometry, hyperref, titlesec, enumitem, multicol)
7. Output ONLY the raw LaTeX code, no markdown fences, no explanation

Generate the complete LaTeX document now:`;

  const latex = await makeAICall(prompt);
  return latex;
};
