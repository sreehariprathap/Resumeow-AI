import { GoogleGenAI } from '@google/genai';
import { getUserProfile, deductTokens } from './tokens';

const getClient = () => {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key not configured. Set EXPO_PUBLIC_GEMINI_API_KEY.');
  return new GoogleGenAI({ apiKey: key });
};

const MODEL = 'gemini-2.0-flash';

const assertAndDeduct = async (uid: string, prompt: string, result: string): Promise<void> => {
  const tokens = Math.max(1, Math.ceil((prompt.length + result.length) / 750));
  await deductTokens(uid, tokens);
};

const checkBalance = async (uid: string): Promise<void> => {
  const profile = await getUserProfile(uid);
  if (profile && !profile.isAdmin && profile.tokensRemaining <= 0) {
    throw new Error('INSUFFICIENT_TOKENS');
  }
};

export const analyzeResume = async (resumeText: string, uid: string): Promise<string> => {
  await checkBalance(uid);
  const ai = getClient();
  const prompt = `You are an expert resume analyst and career coach. Analyze the following resume comprehensively.

Provide feedback on:
1. **Overall Impression** - First impression and overall strength
2. **Content Quality** - Relevance, impact, and clarity of each section
3. **Achievement Metrics** - Use of quantifiable results
4. **Skills Alignment** - Technical and soft skills presentation
5. **Format & Structure** - Layout, readability, length
6. **Key Strengths** - Top 3-5 standout elements
7. **Critical Improvements** - Top 3-5 must-fix issues
8. **ATS Compatibility** - Keyword optimization, formatting for applicant tracking systems

Resume:
---
${resumeText}
---

Be specific, actionable, and encouraging.`;

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
  const text = response.text ?? 'No response received';
  await assertAndDeduct(uid, prompt, text);
  return text;
};

export const generateCoverLetter = async (
  resumeText: string,
  jobDescription: string,
  uid: string
): Promise<string> => {
  await checkBalance(uid);
  const ai = getClient();
  const prompt = `You are an expert cover letter writer. Create a compelling, personalized cover letter.

Resume:
---
${resumeText}
---

Job Description:
---
${jobDescription}
---

Write a professional cover letter that:
- Opens with a strong hook that shows enthusiasm
- Highlights 2-3 specific experiences that match the job requirements
- Shows knowledge of the company/role
- Ends with a clear call to action
- Is 3-4 paragraphs, under 400 words
- Uses first person, active voice
- Avoids clichés and generic phrases

Output only the cover letter text, no additional commentary.`;

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
  const text = response.text ?? 'No response received';
  await assertAndDeduct(uid, prompt, text);
  return text;
};

export interface ATSResult {
  score: number;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
}

export const checkATS = async (
  resumeText: string,
  jobDescription: string,
  uid: string
): Promise<ATSResult> => {
  await checkBalance(uid);
  const ai = getClient();
  const prompt = `You are an ATS (Applicant Tracking System) expert. Analyze how well this resume matches the job description.

Resume:
---
${resumeText}
---

Job Description:
---
${jobDescription}
---

Return a JSON object with exactly this structure:
{
  "score": <number 0-100>,
  "strengths": [<3-5 strings of what matches well>],
  "gaps": [<3-5 strings of missing keywords or skills>],
  "suggestions": [<3-5 actionable improvement strings>]
}

Return only the JSON, no other text.`;

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
  const raw = response.text ?? '{}';
  await assertAndDeduct(uid, prompt, raw);

  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as ATSResult;
  } catch {
    return { score: 0, strengths: [], gaps: [], suggestions: ['Could not parse AI response'] };
  }
};
