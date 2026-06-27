import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepNav } from '../shared';
import type { ResumeProfile } from '@/types/resumeProfile';

interface PersonalInfoStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const PersonalInfoStep = ({ data, onChange, onNext, onBack, onSkip }: PersonalInfoStepProps) => {
  const canProceed = data.firstName && data.lastName && data.email && data.phone && data.location;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>First Name *</Label>
          <Input value={data.firstName || ''} onChange={(e) => onChange({ firstName: e.target.value })} placeholder="Jane" />
        </div>
        <div className="space-y-1.5">
          <Label>Last Name *</Label>
          <Input value={data.lastName || ''} onChange={(e) => onChange({ lastName: e.target.value })} placeholder="Doe" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Email *</Label>
        <Input type="email" value={data.email || ''} onChange={(e) => onChange({ email: e.target.value })} placeholder="jane.doe@email.com" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Phone *</Label>
          <Input value={data.phone || ''} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+1 (555) 000-0000" />
        </div>
        <div className="space-y-1.5">
          <Label>Location *</Label>
          <Input value={data.location || ''} onChange={(e) => onChange({ location: e.target.value })} placeholder="San Francisco, CA" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>LinkedIn <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Input value={data.linkedin || ''} onChange={(e) => onChange({ linkedin: e.target.value })} placeholder="linkedin.com/in/janedoe" />
      </div>
      <div className="space-y-1.5">
        <Label>Website / Portfolio <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Input value={data.website || ''} onChange={(e) => onChange({ website: e.target.value })} placeholder="janedoe.dev" />
      </div>
      <StepNav onBack={onBack} onNext={onNext} canNext={!!canProceed} onSkip={onSkip} />
    </div>
  );
};
