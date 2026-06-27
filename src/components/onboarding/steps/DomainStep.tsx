import { StepNav } from '../shared';
import { DOMAINS } from '@/data/domainRoles';
import type { ResumeProfile } from '@/types/resumeProfile';

interface DomainStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const DomainStep = ({ data, onChange, onNext, onBack, onSkip }: DomainStepProps) => (
  <div className="space-y-5">
    <p className="text-sm text-muted-foreground">Select the field that best describes your career focus.</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {DOMAINS.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onChange({ domain: d.id as ResumeProfile['domain'], targetRoles: [] })}
          className={`p-5 rounded-xl border-2 text-left transition-all hover:border-primary/60 ${
            data.domain === d.id ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <div className="text-3xl mb-2">{d.icon}</div>
          <div className="font-semibold text-sm">{d.label}</div>
        </button>
      ))}
    </div>
    <StepNav onBack={onBack} onNext={onNext} canNext={!!data.domain} onSkip={onSkip} />
  </div>
);
