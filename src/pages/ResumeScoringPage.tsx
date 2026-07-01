import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Loader2,
  BarChart3,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Pencil,
  Lightbulb,
} from 'lucide-react';
import { useAIService } from '@/hooks/useAIService';
import { useAuth } from '@/lib/authContext';
import { getSavedResumes, type SavedResume } from '@/lib/firebaseWeb';
import { FileText, ArrowLeft } from 'lucide-react';

interface ScoringCategory {
  name: string;
  score: number;
  max: number;
  feedback: string;
  fixes: string[];
}

interface ScoringResult {
  overallScore: number;
  grade: string;
  categories: ScoringCategory[];
  topStrengths: string[];
  criticalFixes: string[];
  actionPlan: string;
}

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r={radius} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/30" />
          <circle
            cx="72"
            cy="72"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>{score}</span>
          <span className="text-sm text-muted-foreground">/ 100</span>
          <span className="text-2xl font-bold mt-0.5" style={{ color }}>Grade {grade}</span>
        </div>
      </div>
      <p className="text-base font-semibold">Your Resume Score: {score}/100 · Grade {grade}</p>
    </div>
  );
}

function CategoryProgressBar({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full ${color} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function CategoryCard({ cat }: { cat: ScoringCategory }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((cat.score / cat.max) * 100);

  return (
    <Card>
      <CardContent className="pt-4 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{cat.name}</span>
          <span className="text-sm font-bold">{cat.score}/{cat.max}</span>
        </div>
        <CategoryProgressBar score={cat.score} max={cat.max} />
        <p className="text-xs text-muted-foreground">{cat.feedback}</p>
        <button
          className="flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {open ? 'Hide' : 'How to fix'} ({cat.fixes.length} tip{cat.fixes.length !== 1 ? 's' : ''})
        </button>
        {open && (
          <ul className="space-y-1 mt-1 ml-1">
            {cat.fixes.map((fix, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                {fix}
              </li>
            ))}
          </ul>
        )}
        <div className="text-xs text-muted-foreground font-medium">{pct}%</div>
      </CardContent>
    </Card>
  );
}

export function ResumeScoringPage() {
  const { callForTask } = useAIService();
  const { currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [selectedResume, setSelectedResume] = useState<SavedResume | null>(null);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!currentUser) return;
    getSavedResumes(currentUser.uid)
      .then((savedList) => {
        if (isMounted) {
          setResumes(savedList.sort((a, b) => b.updatedAt - a.updatedAt));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(err);
          toast.error('Failed to load resumes');
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [currentUser]);

  const runScoring = useCallback(async (targetResume?: SavedResume) => {
    const target = targetResume || selectedResume;
    if (!currentUser || !target) return;
    setIsScoring(true);
    setResult(null);

    try {
      const prompt = `You are a professional resume reviewer with 15 years of experience at top recruiting firms.

Analyze this resume LaTeX source code and return ONLY valid JSON:
${target.latex}

{
  "overallScore": 74,
  "grade": "B",
  "categories": [
    {
      "name": "Impact & Quantification",
      "score": 65,
      "max": 100,
      "feedback": "Only 2 of 8 bullet points have measurable outcomes. Add numbers, percentages, and scale.",
      "fixes": ["Add team size to leadership bullets", "Quantify API traffic or user counts"]
    },
    {
      "name": "Keyword Optimization",
      "score": 80,
      "max": 100,
      "feedback": "Good coverage of domain-specific terms. Missing some modern tooling keywords.",
      "fixes": ["Add cloud platform experience if applicable", "Include testing frameworks"]
    },
    {
      "name": "Completeness",
      "score": 90,
      "max": 100,
      "feedback": "All major sections present. Consider adding a projects section.",
      "fixes": ["Add 1-2 personal projects to show initiative"]
    },
    {
      "name": "Clarity & Formatting",
      "score": 70,
      "max": 100,
      "feedback": "Some bullet points are too long or vague.",
      "fixes": ["Keep bullets under 2 lines", "Start every bullet with a strong action verb"]
    },
    {
      "name": "Relevance to Target Role",
      "score": 60,
      "max": 100,
      "feedback": "Profile targets Software Engineer but experience is mostly frontend. Add backend/infra exposure.",
      "fixes": ["Highlight any full-stack or backend work", "Reframe frontend work with backend impact"]
    }
  ],
  "topStrengths": ["Clear career progression", "Strong education background", "Diverse technical skills"],
  "criticalFixes": ["Quantify at least 5 bullet points", "Add a professional summary", "Include a projects section"],
  "actionPlan": "Focus first on quantifying your impact bullets — this alone could raise your score by 15 points."
}`;

      const raw = await callForTask('resumeScore', prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response');
      const parsed: ScoringResult = JSON.parse(jsonMatch[0]);
      setResult(parsed);
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_TOKENS') return;
      toast.error('Scoring failed. Please try again.');
      console.error(err);
    } finally {
      setIsScoring(false);
    }
  }, [currentUser, selectedResume, callForTask]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading resumes…</p>
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-5">
        <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">No resumes found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a resume first in the "My Resumes" section to analyze it.
          </p>
        </div>
        <Button onClick={() => window.location.href = '/resume'}>
          <Pencil className="h-4 w-4 mr-2" /> Go to My Resumes
        </Button>
      </div>
    );
  }

  if (!selectedResume) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Select a Resume to Score
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose one of your generated resumes below to get an AI-powered ATS analysis.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {resumes.map(r => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300 p-5 flex flex-col">
              <div className="flex-1 space-y-4">
                <h3 className="font-semibold text-base leading-tight">{r.name}</h3>
                <div className="rounded-lg bg-muted/40 border border-border/30 px-3 py-2 overflow-hidden max-h-24">
                  <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-all line-clamp-5">
                    {r.latex.slice(0, 300)}
                  </pre>
                </div>
              </div>
              <Button 
                className="w-full mt-4 gap-2" 
                variant="default"
                onClick={() => {
                  setSelectedResume(r);
                  void runScoring(r);
                }}
              >
                <BarChart3 className="h-4 w-4" />
                Analyze This Resume
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" onClick={() => { setSelectedResume(null); setResult(null); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Resumes
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Resume Score: {selectedResume.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered analysis of your resume's strength across 5 key dimensions.
          </p>
        </div>
        <div className="flex gap-2">
          {result && (
            <Button variant="outline" size="sm" onClick={() => void runScoring()} disabled={isScoring} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isScoring ? 'animate-spin' : ''}`} />
              {isScoring ? 'Recalculating…' : 'Recalculate'}
            </Button>
          )}
        </div>
      </div>

      {isScoring && !result && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Scoring your resume "{selectedResume.name}"…</p>
        </div>
      )}

      {result && (
        <>
          {/* Hero gauge */}
          <Card>
            <CardContent className="pt-6 pb-6 flex justify-center">
              <ScoreGauge score={result.overallScore} grade={result.grade} />
            </CardContent>
          </Card>

          {/* Category cards */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Score Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.categories.map((cat, i) => (
                <CategoryCard key={i} cat={cat} />
              ))}
            </div>
          </div>

          {/* Strengths & Critical Fixes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Top Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.topStrengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-green-800 dark:text-green-300">{s}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" /> Critical Fixes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.criticalFixes.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-800 dark:text-red-300">{f}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Action Plan */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-primary mb-1">Action Plan</p>
                <p className="text-sm text-foreground">{result.actionPlan}</p>
              </div>
            </CardContent>
          </Card>

          {/* Fix CTA */}
          <Button className="w-full" onClick={() => window.location.href = `/resume?edit=${selectedResume.id}`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit This Resume
          </Button>
        </>
      )}
    </div>
  );
}
