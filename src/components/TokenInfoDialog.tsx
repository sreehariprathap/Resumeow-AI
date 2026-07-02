import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertCircle } from 'lucide-react';

interface TokenInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEATURE_COSTS: { feature: string; cost: string }[] = [
  { feature: 'Tailoring a resume to a job description', cost: 'Higher' },
  { feature: 'ATS / keyword match analysis', cost: 'Medium' },
  { feature: 'Cover letter generation', cost: 'Medium' },
  { feature: 'Job-fit check', cost: 'Lower' },
  { feature: 'Resume upload parsing', cost: 'Medium' },
  { feature: 'Resume score', cost: 'Lower' },
];

const REDUCTION_TIPS: string[] = [
  'Reuse a saved resume instead of re-uploading and re-parsing the same file.',
  "Only use \"Recalculate\" on the Resume Score page when you've actually changed something.",
  'For small job-description tweaks, edit the tailored resume directly rather than re-running full tailoring.',
  "Use the job-fit check before running full ATS analysis and tailoring on a long-shot posting — if it's not a great match, you'll be asked before the app spends tokens on the rest.",
];

export function TokenInfoDialog({ open, onOpenChange }: TokenInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> How tokens are used
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Typical cost by feature</p>
            <div className="rounded-md border divide-y">
              {FEATURE_COSTS.map(({ feature, cost }) => (
                <div key={feature} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{feature}</span>
                  <span className="text-xs text-muted-foreground font-medium">{cost}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Smart ways to reduce usage</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
              {REDUCTION_TIPS.map(tip => <li key={tip}>{tip}</li>)}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">1 token ≈ 750 characters of AI output.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
