import { useState, useCallback } from 'react';
import { getTaskConfig } from '@/lib/llmConfigResolver';
import { useAIProvider } from '@/lib/aiProviderContext';
import type { LLMTaskKey } from '@/config/llm.config';
import type { AIProvider } from '@/lib/aiProviderContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2, XCircle, Loader2, Circle, ChevronDown, ChevronRight, FlaskConical,
} from 'lucide-react';

// ── Constants ───────────────────────────────────────────────────────────────

const ALL_TASKS: LLMTaskKey[] = [
  'resumeLatex',
  'coverLetter',
  'atsAnalysis',
  'combinedATS',
  'extractJobDetails',
  'jobFit',
  'resumeParse',
  'lazyPipelineJD',
  'lazyPipelineLatex',
  'resumeScore',
  'jdMatcher',
  'bioSummary',
];

const TASK_LABELS: Record<LLMTaskKey, string> = {
  resumeLatex:       'Resume LaTeX Generation',
  coverLetter:       'Cover Letter',
  atsAnalysis:       'ATS Analysis',
  combinedATS:       'Combined ATS + Suggestions',
  extractJobDetails: 'Job Details Extraction',
  jobFit:            'Job Fit Scoring',
  resumeParse:       'Resume Parsing',
  lazyPipelineJD:    'Lazy Pipeline — JD Analysis',
  lazyPipelineLatex: 'Lazy Pipeline — LaTeX',
  resumeScore:       'Resume Scoring',
  jdMatcher:         'JD Matcher',
  bioSummary:        'Bio Summary',
};

// Minimal prompt — cheap, fast, works for any task type
const TEST_PROMPT = 'Respond with exactly three words: LLM HEALTH OK';

// ── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'idle' | 'running' | 'pass' | 'fail';
type Tier = 'free' | 'pro';

interface TaskResult {
  status: TaskStatus;
  model: string;
  provider: AIProvider | string;
  thinking: boolean;
  duration?: number;   // ms
  error?: string;
  response?: string;
}

type TierResults = Record<LLMTaskKey, TaskResult>;

function makeInitialResults(tier: Tier): TierResults {
  return Object.fromEntries(
    ALL_TASKS.map((task) => {
      const cfg = getTaskConfig(task, tier);
      return [task, {
        status:   'idle' as TaskStatus,
        model:    cfg.model,
        provider: cfg.provider,
        thinking: cfg.thinking,
      }];
    })
  ) as TierResults;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
  if (status === 'pass')    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'fail')    return <XCircle className="h-4 w-4 text-red-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

function ProviderBadge({ provider, thinking }: { provider: string; thinking: boolean }) {
  const color =
    provider === 'deepseek' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
    provider === 'gemini'   ? 'bg-blue-500/10   text-blue-400   border-blue-500/20'   :
                              'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${color}`}>
      {provider}
      {thinking && <span className="text-[9px] opacity-70">+think</span>}
    </span>
  );
}

function TaskRow({ label, result }: { label: string; result: TaskResult }) {
  const [expanded, setExpanded] = useState(false);
  const hasFailed = result.status === 'fail';

  return (
    <div className="border-b border-border/40 last:border-0">
      <div
        className={`flex items-center gap-3 py-2 px-1 text-sm ${hasFailed ? 'cursor-pointer hover:bg-red-500/5' : ''}`}
        onClick={() => hasFailed && setExpanded(e => !e)}
      >
        <StatusIcon status={result.status} />

        <span className="flex-1 truncate text-xs text-foreground/80">{label}</span>

        <div className="flex items-center gap-2 shrink-0">
          <ProviderBadge provider={result.provider} thinking={result.thinking} />

          <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">
            {result.duration !== undefined ? `${result.duration}ms` : ''}
          </span>

          {hasFailed && (
            <span className="text-muted-foreground">
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </span>
          )}
        </div>
      </div>

      {/* Error details — expandable */}
      {hasFailed && expanded && result.error && (
        <div className="mx-1 mb-2 p-3 rounded-md bg-red-500/5 border border-red-500/20 text-xs">
          <p className="font-semibold text-red-400 mb-1">Error detail</p>
          <pre className="whitespace-pre-wrap break-all font-mono text-red-300/80 text-[10px] leading-relaxed">
            {result.error}
          </pre>
        </div>
      )}
    </div>
  );
}

function TierPanel({ results, tier }: { results: TierResults; tier: Tier }) {
  const passed  = ALL_TASKS.filter(t => results[t].status === 'pass').length;
  const failed  = ALL_TASKS.filter(t => results[t].status === 'fail').length;
  const running = ALL_TASKS.filter(t => results[t].status === 'running').length;
  const total   = ALL_TASKS.length;

  return (
    <div className="space-y-2">
      {/* Summary bar */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
        {passed  > 0 && <span className="text-emerald-500 font-medium">{passed} passed</span>}
        {failed  > 0 && <span className="text-red-500 font-medium">{failed} failed</span>}
        {running > 0 && <span className="text-blue-400 font-medium">{running} running</span>}
        {passed + failed + running === 0 && <span>Ready to run</span>}
        <span className="ml-auto">{tier === 'free' ? 'Gemini Flash (server)' : 'DeepSeek / Gemini (pro keys)'}</span>
      </div>

      {/* Model legend for this tier */}
      <div className="rounded-md bg-muted/30 border border-border/40 overflow-hidden">
        {ALL_TASKS.map(task => (
          <TaskRow key={task} label={TASK_LABELS[task]} result={results[task]} />
        ))}
      </div>

      {/* Overall progress */}
      {(passed + failed) > 0 && (
        <Progress
          value={Math.round(((passed + failed) / total) * 100)}
          className="h-1"
        />
      )}
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

interface LLMHealthCheckModalProps {
  open: boolean;
  onClose: () => void;
}

export function LLMHealthCheckModal({ open, onClose }: LLMHealthCheckModalProps) {
  const { makeAICallWithModel, makeAICallWithThinking } = useAIProvider();

  const [freeResults, setFreeResults] = useState<TierResults>(() => makeInitialResults('free'));
  const [proResults,  setProResults]  = useState<TierResults>(() => makeInitialResults('pro'));
  const [running,     setRunning]     = useState(false);
  const [activeTab,   setActiveTab]   = useState<'free' | 'pro'>('free');
  const [progress,    setProgress]    = useState(0);  // 0-100 across all tasks

  const reset = useCallback(() => {
    setFreeResults(makeInitialResults('free'));
    setProResults(makeInitialResults('pro'));
    setProgress(0);
  }, []);

  const runTask = useCallback(async (
    task: LLMTaskKey,
    tier: Tier,
    setResults: React.Dispatch<React.SetStateAction<TierResults>>,
  ) => {
    const cfg = getTaskConfig(task, tier);

    // Mark as running
    setResults(prev => ({
      ...prev,
      [task]: { ...prev[task], status: 'running' },
    }));

    const start = Date.now();
    try {
      let response: string;
      if (cfg.thinking && (cfg.provider === 'deepseek' || cfg.provider === 'gemini')) {
        response = await makeAICallWithThinking(TEST_PROMPT, cfg.provider as 'deepseek' | 'gemini');
      } else {
        response = await makeAICallWithModel(TEST_PROMPT, cfg.model, cfg.provider);
      }
      const duration = Date.now() - start;
      setResults(prev => ({
        ...prev,
        [task]: { ...prev[task], status: 'pass', duration, response: response.slice(0, 120) },
      }));
    } catch (err) {
      const duration = Date.now() - start;
      const errorMsg = err instanceof Error
        ? `${err.message}${err.stack ? '\n\nStack:\n' + err.stack.split('\n').slice(0, 6).join('\n') : ''}`
        : String(err);
      setResults(prev => ({
        ...prev,
        [task]: { ...prev[task], status: 'fail', duration, error: errorMsg },
      }));
    }
  }, [makeAICallWithModel, makeAICallWithThinking]);

  const handleRun = useCallback(async (tier?: Tier) => {
    if (running) return;
    setRunning(true);
    reset();

    const tiersToRun: Tier[] = tier ? [tier] : ['free', 'pro'];
    const totalSteps = tiersToRun.length * ALL_TASKS.length;
    let step = 0;

    for (const t of tiersToRun) {
      const setResults = t === 'free' ? setFreeResults : setProResults;
      // Switch to the tab being tested so the user can watch live
      setActiveTab(t);
      for (const task of ALL_TASKS) {
        await runTask(task, t, setResults);
        step++;
        setProgress(Math.round((step / totalSteps) * 100));
      }
    }

    setRunning(false);
  }, [running, reset, runTask]);

  const totalPass = ALL_TASKS.filter(t => freeResults[t].status === 'pass').length
                  + ALL_TASKS.filter(t => proResults[t].status === 'pass').length;
  const totalFail = ALL_TASKS.filter(t => freeResults[t].status === 'fail').length
                  + ALL_TASKS.filter(t => proResults[t].status === 'fail').length;
  const anyRun = totalPass + totalFail > 0;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !running) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-violet-400" />
            LLM Integration Health Check
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Sends a minimal test prompt to each task's configured model and reports latency or errors.
            Each call uses real API quota — results are shown live.
          </p>
        </DialogHeader>

        {/* ── Controls ── */}
        <div className="px-6 py-3 border-b border-border/30 flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => void handleRun()}
            disabled={running}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {running
              ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Running…</>
              : <><FlaskConical className="h-3 w-3 mr-2" /> Run All Tiers</>}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handleRun('free')}  disabled={running}>Free Only</Button>
          <Button size="sm" variant="outline" onClick={() => void handleRun('pro')}   disabled={running}>Pro Only</Button>
          {anyRun && !running && (
            <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
          )}

          {/* Live summary badges */}
          {anyRun && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              {totalPass > 0 && <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20">{totalPass} passed</Badge>}
              {totalFail > 0 && <Badge className="bg-red-500/15 text-red-500 border-red-500/20">{totalFail} failed</Badge>}
            </div>
          )}
        </div>

        {/* Overall progress bar */}
        {running && (
          <Progress value={progress} className="h-0.5 rounded-none" />
        )}

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as Tier)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 mb-0 w-fit">
            <TabsTrigger value="free" className="gap-1.5">
              Free Tier
              {ALL_TASKS.filter(t => freeResults[t].status === 'fail').length > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
              )}
              {ALL_TASKS.every(t => freeResults[t].status === 'pass') && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              )}
            </TabsTrigger>
            <TabsTrigger value="pro" className="gap-1.5">
              Pro Tier
              {ALL_TASKS.filter(t => proResults[t].status === 'fail').length > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
              )}
              {ALL_TASKS.every(t => proResults[t].status === 'pass') && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6 pb-6">
            <TabsContent value="free" className="mt-4">
              <TierPanel results={freeResults} tier="free" />
            </TabsContent>
            <TabsContent value="pro" className="mt-4">
              <TierPanel results={proResults} tier="pro" />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
