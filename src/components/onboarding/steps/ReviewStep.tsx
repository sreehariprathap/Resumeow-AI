import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { ReviewCard } from '../shared';
import { DOMAINS } from '@/data/domainRoles';
import type { ResumeProfile } from '@/types/resumeProfile';

const SkippedWarningCard = ({
  stepIndex,
  label,
  onGoToStep,
}: {
  stepIndex: number;
  label: string;
  onGoToStep: (s: number) => void;
}) => (
  <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
    <span>Not filled in yet</span>
    <button
      onClick={() => onGoToStep(stepIndex)}
      className="text-xs hover:text-foreground underline-offset-2 hover:underline"
    >
      Add {label} later →
    </button>
  </div>
);

interface ReviewStepProps {
  data: Partial<ResumeProfile>;
  onBack: () => void;
  onGenerate: () => void;
  onSkipToFinish: () => void;
  isGenerating: boolean;
  onEditStep: (step: number) => void;
  skippedSteps: Set<number>;
}

export const ReviewStep = ({ data, onBack, onGenerate, onSkipToFinish, isGenerating, onEditStep, skippedSteps }: ReviewStepProps) => {
  const domainLabel = DOMAINS.find((d) => d.id === data.domain)?.label ?? '—';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review your profile below. Click Edit on any section to make changes.</p>

      {skippedSteps.has(1) && !data.firstName ? (
        <SkippedWarningCard stepIndex={1} label="Personal Info" onGoToStep={onEditStep} />
      ) : (
        <ReviewCard title="Personal Info" onEdit={() => onEditStep(1)}>
          <p className="text-sm font-medium">{data.firstName} {data.lastName}</p>
          <p className="text-xs text-muted-foreground">{data.email} · {data.phone}</p>
          <p className="text-xs text-muted-foreground">{data.location}</p>
          {data.linkedin && <p className="text-xs text-muted-foreground">{data.linkedin}</p>}
        </ReviewCard>
      )}

      {skippedSteps.has(2) && !data.domain ? (
        <SkippedWarningCard stepIndex={2} label="Domain & Target Roles" onGoToStep={onEditStep} />
      ) : (
        <ReviewCard title="Domain & Target Roles" onEdit={() => onEditStep(2)}>
          <p className="text-sm font-medium">{domainLabel}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {(data.targetRoles ?? []).map((r) => (
              <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
            ))}
          </div>
        </ReviewCard>
      )}

      {skippedSteps.has(4) && (data.experiences?.length ?? 0) === 0 ? (
        <SkippedWarningCard stepIndex={4} label="Experience" onGoToStep={onEditStep} />
      ) : (data.experiences?.length ?? 0) > 0 && (
        <ReviewCard title={`Experience (${data.experiences!.length})`} onEdit={() => onEditStep(4)}>
          <div className="space-y-3">
            {data.experiences!.map((exp) => (
              <div key={exp.id} className="space-y-1">
                <p className="text-sm font-medium">{exp.role} @ {exp.company}</p>
                <p className="text-xs text-muted-foreground">{exp.from} – {exp.to}</p>
                {exp.bullets.slice(0, 2).map((b, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-2 border-l border-border">• {b}</p>
                ))}
                {exp.bullets.length > 2 && (
                  <p className="text-xs text-muted-foreground pl-2">+{exp.bullets.length - 2} more</p>
                )}
              </div>
            ))}
          </div>
        </ReviewCard>
      )}

      {skippedSteps.has(5) && (data.education?.length ?? 0) === 0 ? (
        <SkippedWarningCard stepIndex={5} label="Education" onGoToStep={onEditStep} />
      ) : (data.education?.length ?? 0) > 0 && (
        <ReviewCard title={`Education (${data.education!.length})`} onEdit={() => onEditStep(5)}>
          <div className="space-y-2">
            {data.education!.map((edu) => (
              <div key={edu.id}>
                <p className="text-sm font-medium">{edu.degree}</p>
                <p className="text-xs text-muted-foreground">{edu.school} · {edu.from} – {edu.to}</p>
              </div>
            ))}
          </div>
        </ReviewCard>
      )}

      {skippedSteps.has(6) && (data.projects?.length ?? 0) === 0 ? (
        <SkippedWarningCard stepIndex={6} label="Projects" onGoToStep={onEditStep} />
      ) : (data.projects?.length ?? 0) > 0 && (
        <ReviewCard title={`Projects (${data.projects!.length})`} onEdit={() => onEditStep(6)}>
          <div className="space-y-1">
            {data.projects!.map((p) => (
              <div key={p.id}>
                <p className="text-sm font-medium">{p.name}</p>
                {p.skills.length > 0 && (
                  <p className="text-xs text-muted-foreground">{p.skills.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </ReviewCard>
      )}

      {skippedSteps.has(8) && (data.skills?.length ?? 0) === 0 ? (
        <SkippedWarningCard stepIndex={8} label="Skills" onGoToStep={onEditStep} />
      ) : (data.skills?.length ?? 0) > 0 && (
        <ReviewCard title={`Skills (${data.skills!.length} groups)`} onEdit={() => onEditStep(8)}>
          <div className="space-y-1">
            {data.skills!.map((g, i) => (
              <p key={i} className="text-xs">
                <span className="font-medium">{g.category}:</span>{' '}
                <span className="text-muted-foreground">{g.skills.join(', ')}</span>
              </p>
            ))}
          </div>
        </ReviewCard>
      )}

      {(data.certifications?.length ?? 0) > 0 && (
        <ReviewCard title={`Certifications (${data.certifications!.length})`} onEdit={() => onEditStep(7)}>
          <div className="flex flex-wrap gap-1">
            {data.certifications!.map((c) => (
              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
            ))}
          </div>
        </ReviewCard>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-1" disabled={isGenerating}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button className="flex-1 gap-2" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating Resume...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Complete Onboarding & Go to Dashboard →</>
          )}
        </Button>
      </div>
      <div className="flex justify-center pt-1">
        <button
          onClick={onSkipToFinish}
          disabled={isGenerating}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:pointer-events-none"
        >
          Looks good, finish without reviewing →
        </button>
      </div>
    </div>
  );
};
