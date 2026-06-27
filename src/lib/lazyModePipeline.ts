import type { ResumeProfile } from '@/types/resumeProfile';
import type { LazyModeSettings } from './firebaseWeb';
import { generateLatexResume } from './resumeGenerator';

export interface PipelineStep {
  id: string;
  label: string;
  status: 'waiting' | 'running' | 'done' | 'error';
  estimatedSeconds: number;
}

export interface Insight {
  emoji: string;
  text: string;
}

export interface JDMatchResult {
  overallScore: number;
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  strengthAreas: { area: string; reason: string }[];
  gapAreas: { area: string; reason: string }[];
  tailoredBullets: { original: string; improved: string }[];
  coverLetterSnippet: string;
  jobTitle?: string;
  company?: string;
}

export interface PipelineResult {
  jdAnalysis: JDMatchResult;
  latexResume: string;
  jobTitle: string;
  company: string;
}

export interface PipelineCallbacks {
  onStepStart: (stepId: string) => void;
  onStepComplete: (stepId: string) => void;
  onComplete: (result: PipelineResult) => void;
  onError: (stepId: string, error: string) => void;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'analyze-jd', label: 'Analyzing job description…', status: 'waiting', estimatedSeconds: 6 },
  { id: 'score-match', label: 'Scoring your resume match…', status: 'waiting', estimatedSeconds: 3 },
  { id: 'identify-gaps', label: 'Identifying keyword gaps…', status: 'waiting', estimatedSeconds: 2 },
  { id: 'improve-bullets', label: 'Crafting improved bullet points…', status: 'waiting', estimatedSeconds: 3 },
  { id: 'generate-latex', label: 'Generating your LaTeX resume…', status: 'waiting', estimatedSeconds: 12 },
  { id: 'finalize', label: 'Finalizing…', status: 'waiting', estimatedSeconds: 1 },
];

export const JOB_MARKET_INSIGHTS: Insight[] = [
  { emoji: '📊', text: 'Recruiters spend an average of 7 seconds reviewing a resume. Your first impression is everything.' },
  { emoji: '🎯', text: '75% of resumes are rejected by ATS before a human ever sees them. Keywords are non-negotiable.' },
  { emoji: '📈', text: 'Candidates who tailor their resume to each job are 3x more likely to get an interview.' },
  { emoji: '🔍', text: 'The average job posting receives 250 applications. Only 4–6 get called for interviews.' },
  { emoji: '💡', text: 'LinkedIn profiles with professional photos get 21x more views and 36x more messages.' },
  { emoji: '🏆', text: 'Quantified achievements (numbers, percentages, dollar amounts) make resumes 40% more memorable.' },
  { emoji: '⚡', text: 'The best time to apply is within 3–5 days of a job posting going live. Early birds get interviews.' },
  { emoji: '🌍', text: 'Remote job postings receive 50% more applications on average. Your competition is global.' },
];

export const MOTIVATIONAL_QUOTES: Insight[] = [
  { emoji: '🚀', text: '"The secret of getting ahead is getting started." — Mark Twain' },
  { emoji: '💪', text: '"Success is not final, failure is not fatal: it is the courage to continue that counts." — Churchill' },
  { emoji: '🌟', text: '"The only way to do great work is to love what you do." — Steve Jobs' },
  { emoji: '🎯', text: '"Opportunities don\'t happen. You create them." — Chris Grosser' },
  { emoji: '🔥', text: '"Don\'t watch the clock; do what it does. Keep going." — Sam Levenson' },
  { emoji: '🌱', text: '"Every expert was once a beginner. Your journey is just getting interesting."' },
  { emoji: '⭐', text: '"You are not defined by your last job title. You are defined by what you bring to the next one."' },
  { emoji: '🎪', text: '"The job you want is looking for someone exactly like you. Make sure they can find you."' },
];

export const LIFE_TIPS: Insight[] = [
  { emoji: '☕', text: 'Take a 5-minute break after applications. Fresh eyes catch mistakes. Rest is productive.' },
  { emoji: '🤝', text: '80% of jobs are filled through networking before they\'re even posted. Grow your connections.' },
  { emoji: '📚', text: 'Learning one new skill per quarter compounds into massive career growth over 5 years.' },
  { emoji: '🧘', text: 'Job searching is a marathon. Celebrate every application as progress, not just the offers.' },
  { emoji: '💬', text: 'Follow up on applications after 5–7 days. A polite email can be the difference.' },
  { emoji: '🎨', text: 'Your personal brand is your career\'s best investment. What do people say about you when you\'re not there?' },
  { emoji: '🏃', text: 'Apply to slightly-above-reach roles. Studies show people self-select out of jobs they\'re qualified for.' },
  { emoji: '💎', text: 'The best investment you can make is in yourself. Every skill you learn is yours forever.' },
];

function applyTailoredBullets(
  profile: ResumeProfile,
  tailoredBullets: { original: string; improved: string }[]
): ResumeProfile {
  if (!tailoredBullets.length) return profile;
  return {
    ...profile,
    experiences: profile.experiences.map((exp) => ({
      ...exp,
      bullets: exp.bullets.map((bullet) => {
        const match = tailoredBullets.find(
          (tb) => bullet.toLowerCase().includes(tb.original.toLowerCase().slice(0, 30))
        );
        return match ? match.improved : bullet;
      }),
    })),
  };
}

export const runLazyModePipeline = async (
  jobDescription: string,
  resumeProfile: ResumeProfile,
  settings: LazyModeSettings,
  makeAICall: (prompt: string) => Promise<string>,
  callbacks: PipelineCallbacks
): Promise<PipelineResult> => {
  // Step 1: Analyze JD
  callbacks.onStepStart('analyze-jd');
  const analysisPrompt = `${settings.defaultPrompt}

You are an expert ATS system and resume coach.

CANDIDATE RESUME PROFILE:
${JSON.stringify(resumeProfile, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Analyze the match and respond with ONLY valid JSON in this exact structure:
{
  "overallScore": 78,
  "summary": "Strong backend match, weak on cloud infrastructure keywords",
  "matchedKeywords": ["Python", "REST APIs", "PostgreSQL"],
  "missingKeywords": ["Kubernetes", "AWS Lambda", "Terraform"],
  "strengthAreas": [
    { "area": "Technical Skills", "reason": "5 years Python matches their senior requirement" }
  ],
  "gapAreas": [
    { "area": "Cloud Infrastructure", "reason": "No AWS/GCP experience listed despite it being required" }
  ],
  "tailoredBullets": [
    {
      "original": "Built REST APIs for internal dashboard",
      "improved": "Architected and deployed 12 production REST APIs serving 50k daily requests, reducing frontend load time by 40%"
    }
  ],
  "coverLetterSnippet": "2-3 sentence opening tailored to this specific role and company",
  "jobTitle": "Software Engineer",
  "company": "Acme Corp"
}`;

  let jdAnalysis: JDMatchResult;
  try {
    const raw = await makeAICall(analysisPrompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response');
    jdAnalysis = JSON.parse(jsonMatch[0]) as JDMatchResult;
  } catch (err) {
    callbacks.onError('analyze-jd', err instanceof Error ? err.message : 'Analysis failed');
    throw err;
  }
  callbacks.onStepComplete('analyze-jd');

  // Step 2: Score match (derived from jdAnalysis — no extra AI call needed)
  callbacks.onStepStart('score-match');
  await new Promise((r) => setTimeout(r, 800));
  callbacks.onStepComplete('score-match');

  // Step 3: Identify gaps
  callbacks.onStepStart('identify-gaps');
  await new Promise((r) => setTimeout(r, 600));
  callbacks.onStepComplete('identify-gaps');

  // Step 4: Improve bullets
  callbacks.onStepStart('improve-bullets');
  await new Promise((r) => setTimeout(r, 600));
  callbacks.onStepComplete('improve-bullets');

  // Step 5: Generate LaTeX
  callbacks.onStepStart('generate-latex');
  const enhancedProfile = applyTailoredBullets(resumeProfile, jdAnalysis.tailoredBullets ?? []);
  let latex: string;
  try {
    latex = await generateLatexResume(enhancedProfile, makeAICall);
  } catch (err) {
    callbacks.onError('generate-latex', err instanceof Error ? err.message : 'Generation failed');
    throw err;
  }
  callbacks.onStepComplete('generate-latex');

  // Step 6: Finalize
  callbacks.onStepStart('finalize');
  await new Promise((r) => setTimeout(r, 800));
  callbacks.onStepComplete('finalize');

  const result: PipelineResult = {
    jdAnalysis,
    latexResume: latex,
    jobTitle: jdAnalysis.jobTitle ?? 'this role',
    company: jdAnalysis.company ?? 'the company',
  };

  callbacks.onComplete(result);
  return result;
};
