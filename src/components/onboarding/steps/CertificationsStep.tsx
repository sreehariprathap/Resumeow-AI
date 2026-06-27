import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepNav } from '../shared';
import { CERTIFICATIONS } from '@/data/certifications';
import type { ResumeProfile } from '@/types/resumeProfile';

interface CertificationsStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const CertificationsStep = ({ data, onChange, onNext, onBack, onSkip }: CertificationsStepProps) => {
  const [search, setSearch] = useState('');
  const selected = data.certifications ?? [];

  const filtered = CERTIFICATIONS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.issuer.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (name: string) => {
    onChange({
      certifications: selected.includes(name) ? selected.filter((c) => c !== name) : [...selected, name],
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Search and select your certifications.</p>
      <Input
        placeholder="Search certifications..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggle(c)}>
              {c} ×
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {filtered.map((cert) => (
          <div key={cert.name} className="flex items-center gap-2 py-1">
            <Checkbox
              id={cert.name}
              checked={selected.includes(cert.name)}
              onCheckedChange={() => toggle(cert.name)}
            />
            <Label htmlFor={cert.name} className="cursor-pointer text-sm leading-snug">
              {cert.name}
              <span className="text-xs text-muted-foreground ml-1">— {cert.issuer}</span>
            </Label>
          </div>
        ))}
      </div>

      <StepNav onBack={onBack} onNext={onNext} canNext={true} nextLabel="Continue" onSkip={onSkip} />
    </div>
  );
};
