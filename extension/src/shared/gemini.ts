import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIAnswers, ResumeProfile } from './types';

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // replace before publishing

export async function generateAIAnswers(
  jobDescription: string,
  resumeProfile: ResumeProfile,
  apiKey: string = GEMINI_API_KEY
): Promise<AIAnswers> {
  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are helping a job applicant auto-fill their application. Based on their resume profile and the job description, generate answers for common application questions.

RESUME PROFILE:
${JSON.stringify(resumeProfile, null, 2)}

JOB DESCRIPTION:
${jobDescription.slice(0, 4000)}

Generate responses as JSON only (no markdown code blocks):
{
  "coverLetter": "3-paragraph cover letter tailored to this role and company",
  "whyThisCompany": "2-3 sentence answer for why interested in this company/role",
  "additionalInfo": "Brief 1-2 sentence statement highlighting most relevant qualification",
  "yearsOfExperience": "number only, e.g. 5"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid AI response format');
  return JSON.parse(jsonMatch[0]) as AIAnswers;
}
