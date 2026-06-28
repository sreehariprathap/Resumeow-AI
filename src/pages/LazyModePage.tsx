import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAIService } from '@/hooks/useAIService';
import { useAuth } from '@/lib/authContext';
import { useTokens } from '@/lib/tokenContext';
import { useLazyMode } from '@/lib/lazyModeContext';
import { getUserData } from '@/lib/firebaseWeb';
import { useProfileGate } from '@/hooks/useProfileGate';
import { ProfileGateBanner } from '@/components/ProfileGateBanner';
import {
  runLazyModePipeline,
  PIPELINE_STEPS,
  type PipelineStep,
  type PipelineResult,
  type JDMatchResult,
} from '@/lib/lazyModePipeline';
import { LazyModePipeline } from '@/components/LazyModePipeline';
import type { ResumeProfile } from '@/types/resumeProfile';

type PageState = 'input' | 'running' | 'review' | 'done';

export function LazyModePage() {
  const { callForTask } = useAIService();
  const { currentUser } = useAuth();
  const { tokensRemaining } = useTokens();
  const { settings, openSettings } = useLazyMode();
  const navigate = useNavigate();
  const { status, loading: gateLoading } = useProfileGate();

  const [jdText, setJdText] = useState('');
  const [pageState, setPageState] = useState<PageState>('input');
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(PIPELINE_STEPS.map((s) => ({ ...s })));
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);

  // For non-auto-generate review
  const [analysisResult, setAnalysisResult] = useState<JDMatchResult | null>(null);

  const updateStep = (stepId: string, status: PipelineStep['status']) => {
    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status } : s))
    );
  };

  const handleGenerate = async () => {
    if (!jdText.trim()) {
      toast.error('Please paste a job description first.');
      return;
    }
    if (!currentUser) {
      toast.error('Please log in first.');
      return;
    }

    const profileData = await getUserData(currentUser.uid, 'resumeProfile').catch(() => null);
    if (!profileData) {
      toast.error('No resume profile found. Complete the onboarding first.');
      return;
    }

    const profile = profileData as ResumeProfile;

    // Reset steps
    setPipelineSteps(PIPELINE_STEPS.map((s) => ({ ...s })));
    setPipelineResult(null);
    setPageState('running');

    try {
      const result = await runLazyModePipeline(
        jdText,
        profile,
        settings,
        (prompt) => callForTask('lazyPipelineJD', prompt),
        (prompt) => callForTask('lazyPipelineLatex', prompt),
        {
          onStepStart: (id) => updateStep(id, 'running'),
          onStepComplete: (id) => updateStep(id, 'done'),
          onComplete: (r) => {
            if (settings.autoGenerate) {
              sessionStorage.setItem('generatedLatex', r.latexResume);
              setPipelineResult(r);
              setPageState('done');
            } else {
              setAnalysisResult(r.jdAnalysis);
              sessionStorage.setItem('generatedLatex', r.latexResume);
              setPipelineResult(r);
              setPageState('review');
            }
          },
          onError: (id, err) => {
            updateStep(id, 'error');
            toast.error(`Pipeline failed at "${id}": ${err}`);
            setPageState('input');
          },
        }
      );
      void result;
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_TOKENS') return;
      toast.error('Pipeline failed. Please try again.');
      setPageState('input');
    }
  };

  const handleViewResume = () => {
    navigate('/resume');
  };

  const handleRunAgain = () => {
    setJdText('');
    setPipelineSteps(PIPELINE_STEPS.map((s) => ({ ...s })));
    setPipelineResult(null);
    setAnalysisResult(null);
    setPageState('input');
  };

  // Full-screen pipeline view
  if (pageState === 'running' || pageState === 'done') {
    return (
      <LazyModePipeline
        steps={pipelineSteps}
        result={pageState === 'done' ? pipelineResult : null}
        onViewResume={handleViewResume}
        onRunAgain={handleRunAgain}
      />
    );
  }

  // Review mode (autoGenerate is off)
  if (pageState === 'review' && analysisResult) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">⚡ Lazy Mode — Analysis</h1>
          <Button variant="outline" size="sm" onClick={openSettings} className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Settings
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{
                background: analysisResult.overallScore >= 80
                  ? 'rgba(34,197,94,0.15)'
                  : analysisResult.overallScore >= 60
                  ? 'rgba(234,179,8,0.15)'
                  : 'rgba(239,68,68,0.15)',
                color: analysisResult.overallScore >= 80 ? '#22c55e' : analysisResult.overallScore >= 60 ? '#eab308' : '#ef4444',
                border: `2px solid currentColor`,
              }}
            >
              {analysisResult.overallScore}
            </div>
            <div>
              <p className="font-semibold">Match Score</p>
              <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Top Insights</p>
            {analysisResult.gapAreas.slice(0, 3).map((g, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-orange-400 mt-0.5">•</span>
                <span className="text-muted-foreground"><strong className="text-foreground">{g.area}:</strong> {g.reason}</span>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handleViewResume}>
          View Generated Resume →
        </Button>
        <button className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={handleRunAgain}>
          Start Over
        </button>
      </div>
    );
  }

  // Input state
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">⚡ Lazy Mode</h1>
          <p className="text-sm text-muted-foreground mt-1">Paste a job description. We handle the rest.</p>
        </div>
        <Button variant="outline" size="sm" onClick={openSettings} className="gap-1.5 shrink-0">
          <Settings className="h-3.5 w-3.5" /> Settings
        </Button>
      </div>

      {!gateLoading && status && <ProfileGateBanner status={status} featureName="Lazy Mode" />}

      <Textarea
        placeholder="Paste the job description here — include requirements, responsibilities, and qualifications for the best results…"
        className="min-h-[320px] resize-none text-sm"
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
      />

      <Button
        className="w-full lazy-generate-btn"
        size="lg"
        onClick={handleGenerate}
        disabled={!jdText.trim() || !status?.hasMinimumData}
      >
        {!status?.hasMinimumData ? '⚡ Complete your profile first' : '⚡ Generate My Resume'}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Est. ~10 tokens · Your balance:{' '}
        <span className="font-medium text-foreground">{tokensRemaining} remaining</span>
      </p>

      {!settings.autoGenerate && (
        <p className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
          Review mode on — you'll see the analysis before the resume is generated.
        </p>
      )}
    </div>
  );
}
