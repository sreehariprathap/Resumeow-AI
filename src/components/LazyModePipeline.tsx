import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PIPELINE_STEPS,
  JOB_MARKET_INSIGHTS,
  MOTIVATIONAL_QUOTES,
  LIFE_TIPS,
  type PipelineStep,
  type Insight,
  type PipelineResult,
} from '@/lib/lazyModePipeline';

interface LazyModePipelineProps {
  steps: PipelineStep[];
  result: PipelineResult | null;
  onViewResume: () => void;
  onRunAgain: () => void;
}

function getInsightPool(activeStepIndex: number): Insight[] {
  if (activeStepIndex <= 2) return JOB_MARKET_INSIGHTS;
  if (activeStepIndex <= 4) return MOTIVATIONAL_QUOTES;
  return LIFE_TIPS;
}

function StepRow({ step }: { step: PipelineStep }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-6 h-6 flex items-center justify-center shrink-0">
        {step.status === 'done' && (
          <CheckCircle2 className="w-5 h-5 text-green-400 step-complete-icon" />
        )}
        {step.status === 'running' && (
          <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
        )}
        {step.status === 'waiting' && (
          <div className="w-4 h-4 rounded-full border-2 border-white/20" />
        )}
        {step.status === 'error' && (
          <div className="w-4 h-4 rounded-full bg-red-500" />
        )}
      </div>
      <span
        className={`text-sm transition-all duration-300 ${
          step.status === 'done'
            ? 'text-white/50 line-through'
            : step.status === 'running'
            ? 'text-white font-semibold'
            : step.status === 'error'
            ? 'text-red-400'
            : 'text-white/40'
        }`}
      >
        {step.label}
      </span>
    </div>
  );
}

export function LazyModePipeline({ steps, result, onViewResume, onRunAgain }: LazyModePipelineProps) {
  const [currentInsight, setCurrentInsight] = useState<Insight>(JOB_MARKET_INSIGHTS[0]);
  const [insightVisible, setInsightVisible] = useState(true);
  const insightIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeStepIndex = steps.findIndex((s) => s.status === 'running');
  const doneCount = steps.filter((s) => s.status === 'done').length;
  const totalSteps = PIPELINE_STEPS.length;
  const progressPct = result ? 100 : Math.round((doneCount / totalSteps) * 100);

  useEffect(() => {
    const pool = getInsightPool(activeStepIndex === -1 ? 5 : activeStepIndex);

    const rotate = () => {
      setInsightVisible(false);
      setTimeout(() => {
        insightIndexRef.current = (insightIndexRef.current + 1) % pool.length;
        setCurrentInsight(pool[insightIndexRef.current]);
        setInsightVisible(true);
      }, 400);
    };

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(rotate, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeStepIndex]);

  if (result) {
    return (
      <div className="lazy-pipeline-bg min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="completion-check w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Your resume is ready!</h2>
            <p className="text-white/60 mt-2 text-sm">
              Tailored to <span className="text-white font-medium">{result.jobTitle}</span> at{' '}
              <span className="text-white font-medium">{result.company}</span>
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={onViewResume} size="lg" className="w-full text-base">
              View Resume →
            </Button>
            <button onClick={onRunAgain} className="text-sm text-white/50 hover:text-white/80 transition-colors">
              Run Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lazy-pipeline-bg min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <p className="text-indigo-300 text-sm font-medium tracking-widest uppercase mb-1">⚡ Lazy Mode</p>
          <h2 className="text-2xl font-bold text-white">Building your perfect resume…</h2>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Steps */}
        <div className="bg-white/5 rounded-2xl border border-white/10 px-6 py-4 space-y-1">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </div>

        {/* Insight card */}
        <div
          className={`insight-card bg-white/5 border border-white/10 rounded-2xl px-6 py-5 transition-opacity duration-400 ${
            insightVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p className="text-2xl mb-2">{currentInsight.emoji}</p>
          <p className="text-sm text-white/70 leading-relaxed">{currentInsight.text}</p>
        </div>

        {/* Spinner row */}
        <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          AI is working on it…
        </div>
      </div>
    </div>
  );
}
