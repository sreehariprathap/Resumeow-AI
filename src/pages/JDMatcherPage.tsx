import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Loader2,
  Target,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  FileText,
  Zap,
  Building2,
  BriefcaseBusiness,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { getUserData, saveUserData } from '@/lib/firebaseWeb';

import { compileLatexToPdf, downloadPdf, getResumePdfFilename, LatexCompileError, PDF_COMPILE_TOKEN_COST } from '@/lib/latexCompiler';
import { PdfPreviewDialog } from '@/components/PdfPreviewDialog';
import type { ResumeProfile } from '@/types/resumeProfile';
import { useNavigate } from 'react-router-dom';
import { useProfileGate } from '@/hooks/useProfileGate';
import { ProfileGateBanner } from '@/components/ProfileGateBanner';
import { useAIService } from '@/hooks/useAIService';
import { useTokens } from '@/lib/tokenContext';
import { RequestTokensDialog } from '@/components/RequestTokensDialog';

interface StrengthArea { area: string; reason: string }
interface GapArea { area: string; reason: string }
interface TailoredBullet { original: string; improved: string }

interface JDMatchResult {
  company: string;
  role: string;
  overallScore: number;
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  strengthAreas: StrengthArea[];
  gapAreas: GapArea[];
  tailoredBullets: TailoredBullet[];
  coverLetterSnippet: string;
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
          <circle cx="64" cy="64" r={radius} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground">Match Score</p>
    </div>
  );
}

export function JDMatcherPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { status, loading: gateLoading } = useProfileGate();
  const { deductTokens, isAdmin, assertSufficientBalance } = useTokens();
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);

  const { makeAnalysisCall, generateResumeLatex, callForTask } = useAIService({
    onInsufficientTokens: () => setTokenDialogOpen(true),
  });

  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<JDMatchResult | null>(null);

  // Tailored resume generation + PDF state
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  // 0=idle, 1=job-fit running, 2=keyword-analysis running, 3=latex running, 4=compiling, 5=done
  const [generationStep, setGenerationStep] = useState<0|1|2|3|4|5>(0);
  const [stepResults, setStepResults] = useState<{
    jobFit: { score: number; label: string } | null;
    keywords: { matched: number; missing: number } | null;
  }>({ jobFit: null, keywords: null });
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [generatedProfile, setGeneratedProfile] = useState<ResumeProfile | null>(null);

  const handleAnalyze = async () => {
    if (!jdText.trim()) { toast.error('Please paste a job description first.'); return; }
    if (!currentUser) { toast.error('Please log in.'); return; }

    setIsAnalyzing(true);
    try {
      const profileData = await getUserData(currentUser.uid, 'resumeProfile');
      if (!profileData) {
        toast.error('No resume profile found. Please complete onboarding first.');
        return;
      }
      const profile = profileData as ResumeProfile;

      const prompt = `You are an expert ATS system and resume coach.

CANDIDATE RESUME PROFILE:
${JSON.stringify(profile, null, 2)}

JOB DESCRIPTION:
${jdText}

Analyze the match and respond with ONLY valid JSON in this exact structure:
{
  "company": "Exact company name extracted from job description, or empty string if not found",
  "role": "Exact job title/role extracted from job description, or empty string if not found",
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
  "coverLetterSnippet": "2-3 sentence opening tailored to this specific role and company"
}`;

      const raw = await makeAnalysisCall(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid response from AI');
      const parsed: JDMatchResult = JSON.parse(jsonMatch[0]);
      setResult(parsed);

      const existing = await getUserData(currentUser.uid, 'jdMatches');
      const history: JDMatchResult[] = (existing as { matches?: JDMatchResult[] })?.matches ?? [];
      await saveUserData(currentUser.uid, 'jdMatches', { matches: [parsed, ...history].slice(0, 5) });

      toast.success('Analysis complete!');
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_TOKENS') {
        setTokenDialogOpen(true);
        return;
      }
      toast.error('Analysis failed. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateTailored = async () => {
    if (!result || !currentUser) return;
    setIsGeneratingResume(true);
    setStepResults({ jobFit: null, keywords: null });

    try {
      const profileData = await getUserData(currentUser.uid, 'resumeProfile');
      if (!profileData) throw new Error('No profile');
      const profile = profileData as ResumeProfile;

      // ── Step 1: Job Fit ────────────────────────────────────────────────────
      setGenerationStep(1);
      const jobFitPrompt = `You are a strict hiring gatekeeper. Analyze this job description for MANDATORY requirements and check the resume against each one.

JOB DESCRIPTION:
${jdText}

RESUME PROFILE:
${JSON.stringify(profile, null, 2)}

Return ONLY valid JSON: { "fitScore": <0-100>, "label": "<Great Match|Decent Match|Tough Match|Not a Fit>", "mandatoryRequirements": [], "summary": "<2 sentence verdict>" }`;

      const jobFitRaw = await callForTask('jobFit', jobFitPrompt);
      const jobFitMatch = jobFitRaw.match(/\{[\s\S]*\}/);
      if (jobFitMatch) {
        const jf = JSON.parse(jobFitMatch[0]);
        setStepResults(prev => ({ ...prev, jobFit: { score: jf.fitScore, label: jf.label } }));
      }

      // ── Step 2: Keyword Analysis ───────────────────────────────────────────
      setGenerationStep(2);
      const keywordPrompt = `Analyze this resume against the job description for keyword and ATS compatibility.

JOB DESCRIPTION:
${jdText}

RESUME PROFILE:
${JSON.stringify(profile, null, 2)}

Return ONLY valid JSON: { "overall": <0-100>, "keywordMatch": <0-100>, "missingKeywords": ["..."], "matchedKeywords": ["..."], "recommendations": ["..."] }`;

      const keywordRaw = await callForTask('combinedATS', keywordPrompt);
      const keywordMatch = keywordRaw.match(/\{[\s\S]*\}/);
      if (keywordMatch) {
        const kw = JSON.parse(keywordMatch[0]);
        setStepResults(prev => ({
          ...prev,
          keywords: {
            matched: (kw.matchedKeywords ?? []).length,
            missing: (kw.missingKeywords ?? []).length,
          },
        }));
      }

      // ── Step 3: LaTeX Resume ───────────────────────────────────────────────
      setGenerationStep(3);
      const improvedProfile: ResumeProfile = {
        ...profile,
        experiences: profile.experiences.map(exp => ({
          ...exp,
          bullets: exp.bullets.map(bullet => {
            const match = result.tailoredBullets.find(
              tb => bullet.toLowerCase().includes(tb.original.toLowerCase().slice(0, 30))
            );
            return match ? match.improved : bullet;
          }),
        })),
      };
      setGeneratedProfile(improvedProfile);

      const latex = await generateResumeLatex(
        `Generate a professional LaTeX resume for:\n${JSON.stringify(improvedProfile, null, 2)}`
      );
      sessionStorage.setItem('generatedLatex', latex);

      // ── Step 4: PDF Compile ────────────────────────────────────────────────
      if (!isAdmin) {
        try { await assertSufficientBalance(PDF_COMPILE_TOKEN_COST); }
        catch { setTokenDialogOpen(true); toast.error('No tokens left.'); return; }
      }
      setGenerationStep(4);
      setPdfBlob(null);
      setCompileError(null);
      setIsCompiling(true);
      setIsPdfOpen(true);
      try {
        const blob = await compileLatexToPdf(latex);
        setPdfBlob(blob);
        setGenerationStep(5);
        if (!isAdmin) { void deductTokens(PDF_COMPILE_TOKEN_COST); }
      } catch (compileErr) {
        const log = compileErr instanceof LatexCompileError ? compileErr.log : String(compileErr);
        setCompileError(log);
        toast.error('PDF preview unavailable — resume saved, go to /resume page.');
        navigate('/resume');
      } finally {
        setIsCompiling(false);
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_TOKENS') {
        setTokenDialogOpen(true); return;
      }
      toast.error('Failed to generate tailored resume.');
      console.error(err);
    } finally {
      setIsGeneratingResume(false);
      setGenerationStep(0);
    }
  };

  const pdfFilename = getResumePdfFilename({
    firstName: generatedProfile?.firstName,
    lastName: generatedProfile?.lastName,
    position: result?.role,
    company: result?.company,
  });

  const copySnippet = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.coverLetterSnippet)
      .then(() => toast.success('Copied to clipboard!'));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" /> Job Description Matcher
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste any job description to see how well your resume matches — and how to improve it.
        </p>
      </div>

      {!gateLoading && status && <ProfileGateBanner status={status} featureName="Job Description Matcher" />}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-2 space-y-3">
          <label className="text-sm font-medium">Paste Job Description</label>
          <Textarea
            placeholder="Paste the full job description here — include requirements, responsibilities, and qualifications for the best analysis…"
            className="min-h-[400px] resize-none text-sm font-mono"
            value={jdText}
            onChange={e => setJdText(e.target.value)}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{jdText.length} characters</span>
            {jdText.length > 0 && jdText.length < 200 && (
              <span className="text-yellow-500">Add more details for a better analysis</span>
            )}
          </div>
          <Button
            className="w-full"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !jdText.trim() || !status?.hasMinimumData}
          >
            {isAnalyzing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing Match…</>
            ) : !status?.hasMinimumData ? 'Complete your profile first' : (
              <><Zap className="h-4 w-4 mr-2" /> Analyze Match</>
            )}
          </Button>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-3">
          {!result && !isAnalyzing && (
            <div className="flex flex-col items-center justify-center min-h-[400px] rounded-xl border border-dashed border-muted-foreground/25 text-center p-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Paste a job description to see</p>
                <p className="text-sm text-muted-foreground">how well your resume matches</p>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your resume against the job description…</p>
            </div>
          )}

          {result && !isAnalyzing && (
            <div className="space-y-5">
              {/* Company + role extracted */}
              {(result.company || result.role) && (
                <div className="flex flex-wrap gap-2 items-center">
                  {result.company && (
                    <Badge variant="outline" className="gap-1.5 text-xs">
                      <Building2 className="h-3 w-3" /> {result.company}
                    </Badge>
                  )}
                  {result.role && (
                    <Badge variant="outline" className="gap-1.5 text-xs">
                      <BriefcaseBusiness className="h-3 w-3" /> {result.role}
                    </Badge>
                  )}
                </div>
              )}

              {/* Score */}
              <Card>
                <CardContent className="pt-5 flex flex-col sm:flex-row items-center gap-6">
                  <ScoreGauge score={result.overallScore} />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium">{result.summary}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.matchedKeywords.slice(0, 5).map(kw => (
                        <Badge key={kw} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Keywords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Matched Keywords
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.matchedKeywords.map(kw => (
                        <Badge key={kw} className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs font-normal">{kw}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Missing Keywords
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.missingKeywords.map(kw => (
                        <Badge key={kw} title="Consider adding this to your resume"
                          className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs font-normal cursor-help">{kw}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Strengths & Gaps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Strength Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.strengthAreas.map((s, i) => (
                      <div key={i} className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 space-y-0.5">
                        <p className="text-xs font-semibold text-green-800 dark:text-green-300">{s.area}</p>
                        <p className="text-xs text-green-700 dark:text-green-400">{s.reason}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Gap Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.gapAreas.map((g, i) => (
                      <div key={i} className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3 space-y-0.5">
                        <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">{g.area}</p>
                        <p className="text-xs text-orange-700 dark:text-orange-400">{g.reason}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Improved Bullets */}
              {result.tailoredBullets.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-primary" /> Improved Bullet Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.tailoredBullets.map((tb, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Original</p>
                          <p className="text-xs text-muted-foreground line-through">{tb.original}</p>
                        </div>
                        <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                          <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1 flex items-center gap-1">
                            <ArrowRight className="h-2.5 w-2.5" /> Improved
                          </p>
                          <p className="text-xs">{tb.improved}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Cover Letter Snippet */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" /> Cover Letter Opening
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative rounded-lg bg-muted/50 p-4">
                    <p className="text-sm italic pr-8">{result.coverLetterSnippet}</p>
                    <button onClick={copySnippet}
                      className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-background text-muted-foreground"
                      title="Copy to clipboard">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* CTA + Step Progress */}
              {isGeneratingResume ? (
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <p className="text-sm font-semibold text-center">Generating your tailored resume…</p>
                  <div className="space-y-3">
                    {([
                      { step: 1, label: 'Is this job right for you?', detail: stepResults.jobFit ? `${stepResults.jobFit.label} · ${stepResults.jobFit.score}/100` : null },
                      { step: 2, label: 'Keyword & ATS analysis', detail: stepResults.keywords ? `${stepResults.keywords.matched} matched · ${stepResults.keywords.missing} missing` : null },
                      { step: 3, label: 'Generating tailored LaTeX resume', detail: null },
                      { step: 4, label: 'Compiling PDF', detail: null },
                    ] as const).map(({ step, label, detail }) => {
                      const isDone = generationStep > step;
                      const isActive = generationStep === step;
                      return (
                        <div key={step} className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${
                          isDone ? 'bg-green-50 dark:bg-green-900/20' :
                          isActive ? 'bg-primary/10 border border-primary/25' :
                          'opacity-40'
                        }`}>
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDone ? 'bg-green-500 text-white' :
                            isActive ? 'bg-primary text-primary-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {isDone ? '✓' : step}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>{label}</p>
                            {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                          </div>
                          {isActive && <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Button className="w-full" onClick={handleGenerateTailored}>
                  <FileText className="h-4 w-4 mr-2" /> Generate Tailored Resume as PDF
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <PdfPreviewDialog
        open={isPdfOpen}
        onOpenChange={open => {
          setIsPdfOpen(open);
          if (!open && pdfBlob) navigate('/resume');
        }}
        pdfBlob={pdfBlob}
        isCompiling={isCompiling}
        compileError={compileError}
        onDownload={() => { if (pdfBlob) downloadPdf(pdfBlob, pdfFilename); }}
      />

      <RequestTokensDialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen} />
    </div>
  );
}
