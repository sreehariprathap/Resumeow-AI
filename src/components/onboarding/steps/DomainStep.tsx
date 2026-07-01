import { useState } from 'react';
import { StepNav } from '../shared';
import { DOMAINS } from '@/data/domainRoles';
import type { ResumeProfile } from '@/types/resumeProfile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DomainStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const DomainStep = ({ data, onChange, onNext, onBack, onSkip }: DomainStepProps) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customValue.trim()) {
      onChange({ domain: customValue.trim(), targetRoles: [] });
      setShowCustom(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Select the field that best describes your career focus.</p>
      
      {!showCustom ? (
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
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="p-5 rounded-xl border-2 border-dashed border-border text-left transition-all hover:border-primary/60 flex flex-col justify-center items-center text-muted-foreground"
          >
            <div className="text-3xl mb-2">✨</div>
            <div className="font-semibold text-sm">Other (Custom)</div>
          </button>
        </div>
      ) : (
        <form onSubmit={handleCustomSubmit} className="flex gap-2 items-center p-4 border rounded-xl bg-muted/20">
          <Input 
            placeholder="e.g. Painting, Freelance..." 
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            autoFocus
          />
          <Button type="submit">Save</Button>
          <Button type="button" variant="ghost" onClick={() => setShowCustom(false)}>Cancel</Button>
        </form>
      )}
      
      {/* Show selected custom domain if it doesn't match standard IDs and showCustom is false */}
      {!showCustom && data.domain && !DOMAINS.find(d => d.id === data.domain) && (
        <div className="mt-4 p-4 border rounded-xl border-primary bg-primary/5 flex justify-between items-center">
          <div>
            <span className="text-sm font-semibold">Custom Domain:</span> {data.domain}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowCustom(true)}>Edit</Button>
        </div>
      )}

      <StepNav onBack={onBack} onNext={onNext} canNext={!!data.domain} onSkip={onSkip} />
    </div>
  );
};
