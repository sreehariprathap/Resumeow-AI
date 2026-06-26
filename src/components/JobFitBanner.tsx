import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { CheckCircle2, XCircle, Target, RefreshCw } from 'lucide-react';
import type { JobFitResult } from '@/hooks/useAIService';

interface JobFitBannerProps {
  result: JobFitResult | null;
  isLoading: boolean;
}

function getScoreStyle(score: number): { bar: string; badge: string; bg: string; border: string } {
  if (score >= 90) return {
    bar: '[&>div]:bg-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
  };
  if (score >= 60) return {
    bar: '[&>div]:bg-yellow-500',
    badge: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    bg: 'bg-yellow-500/5',
    border: 'border-yellow-500/20',
  };
  if (score >= 30) return {
    bar: '[&>div]:bg-orange-500',
    badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    bg: 'bg-orange-500/5',
    border: 'border-orange-500/20',
  };
  return {
    bar: '[&>div]:bg-red-500',
    badge: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
  };
}

export function JobFitBanner({ result, isLoading }: JobFitBannerProps) {
  if (!isLoading && !result) return null;

  const style = result ? getScoreStyle(result.fitScore) : null;

  return (
    <Card className={`w-full ${style ? `${style.bg} ${style.border}` : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Is this job right for you?
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
          {result && (
            <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border ${style!.badge}`}>
              {result.label}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && !result && (
          <div className="text-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Checking mandatory requirements...</p>
          </div>
        )}

        {result && (
          <>
            {/* Score bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Overall fit</span>
                <span className="text-sm font-bold">{result.fitScore}%</span>
              </div>
              <Progress value={result.fitScore} className={`h-3 ${style!.bar}`} />
            </div>

            {/* Summary */}
            <p className="text-xs text-muted-foreground leading-relaxed">{result.summary}</p>

            {/* Mandatory requirements list */}
            {result.mandatoryRequirements.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium">Mandatory requirements</p>
                {result.mandatoryRequirements.map((req, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-md border bg-background/60">
                    {req.met
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    }
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium">{req.requirement}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${req.met ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400' : 'border-red-500/40 text-red-600 dark:text-red-400'}`}
                        >
                          {req.met ? 'Met' : 'Missing'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{req.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
