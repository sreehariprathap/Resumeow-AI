import { useState } from 'react';
import { StepNav } from '../shared';
import { DOMAIN_ROLES } from '@/data/domainRoles';
import type { ResumeProfile } from '@/types/resumeProfile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface TargetRolesStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const TargetRolesStep = ({ data, onChange, onNext, onBack, onSkip }: TargetRolesStepProps) => {
  const suggestedRoles = data.domain ? (DOMAIN_ROLES[data.domain] ?? []) : [];
  const selected = data.targetRoles ?? [];
  const [customRole, setCustomRole] = useState('');

  const toggle = (role: string) => {
    if (selected.includes(role)) {
      onChange({ targetRoles: selected.filter((r) => r !== role) });
    } else {
      onChange({ targetRoles: [...selected, role] });
    }
  };

  const addCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRole = customRole.trim();
    if (cleanRole && !selected.includes(cleanRole)) {
      onChange({ targetRoles: [...selected, cleanRole] });
    }
    setCustomRole('');
  };

  // Combine suggested roles that aren't selected yet, plus all selected roles
  const allDisplayRoles = Array.from(new Set([...selected, ...suggestedRoles]));

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Select or add the roles you are targeting. You can select as many as you like.
        <span className="font-medium text-foreground ml-2">{selected.length} selected</span>
      </p>
      
      <form onSubmit={addCustomRole} className="flex gap-2">
        <Input 
          placeholder="Add a custom role..." 
          value={customRole}
          onChange={(e) => setCustomRole(e.target.value)}
        />
        <Button type="submit" size="icon" variant="secondary"><Plus className="w-4 h-4" /></Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {allDisplayRoles.map((role) => {
          const isSelected = selected.includes(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() => toggle(role)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
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
