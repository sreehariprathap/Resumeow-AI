import { StepNav } from '../shared';
import { DOMAIN_ROLES } from '@/data/domainRoles';
import type { ResumeProfile } from '@/types/resumeProfile';

interface TargetRolesStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const TargetRolesStep = ({ data, onChange, onNext, onBack, onSkip }: TargetRolesStepProps) => {
  const roles = data.domain ? (DOMAIN_ROLES[data.domain] ?? []) : [];
  const selected = data.targetRoles ?? [];
  const MAX = 5;

  const toggle = (role: string) => {
    if (selected.includes(role)) {
      onChange({ targetRoles: selected.filter((r) => r !== role) });
    } else if (selected.length < MAX) {
      onChange({ targetRoles: [...selected, role] });
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Select up to {MAX} roles you are targeting.{' '}
        <span className="font-medium text-foreground">{selected.length}/{MAX} selected</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => {
          const isSelected = selected.includes(role);
          const isDisabled = !isSelected && selected.length >= MAX;
          return (
            <button
              key={role}
              type="button"
              onClick={() => toggle(role)}
              disabled={isDisabled}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : isDisabled
                  ? 'opacity-40 cursor-not-allowed border-border'
                  : 'border-border hover:border-primary/60'
              }`}
            >
              {role}
            </button>
          );
        })}
      </div>
      <StepNav onBack={onBack} onNext={onNext} canNext={selected.length > 0} onSkip={onSkip} />
    </div>
  );
};
