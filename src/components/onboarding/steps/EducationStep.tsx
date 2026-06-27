import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { StepNav } from '../shared';
import type { ResumeProfile, Education } from '@/types/resumeProfile';

const uid = () => crypto.randomUUID();

const emptyEducation = (): Education => ({
  id: uid(),
  school: '',
  degree: '',
  from: '',
  to: '',
  bullets: [],
});

interface EducationStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const EducationStep = ({ data, onChange, onNext, onBack, onSkip }: EducationStepProps) => {
  const entries = data.education ?? [];

  const add = () => onChange({ education: [...entries, emptyEducation()] });

  const update = (id: string, patch: Partial<Education>) =>
    onChange({ education: entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const remove = (id: string) =>
    onChange({ education: entries.filter((e) => e.id !== id) });

  const updateBullets = (id: string, raw: string) => {
    const bullets = raw.split('\n').filter((b) => b.trim());
    update(id, { bullets });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Add your educational background.</p>

      {entries.map((edu, i) => (
        <Card key={edu.id}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Education {i + 1}</CardTitle>
            <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => remove(edu.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">School / University</Label>
                <Input
                  className="h-8 text-sm"
                  value={edu.school}
                  onChange={(e) => update(edu.id, { school: e.target.value })}
                  placeholder="MIT"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Degree</Label>
                <Input
                  className="h-8 text-sm"
                  value={edu.degree}
                  onChange={(e) => update(edu.id, { degree: e.target.value })}
                  placeholder="B.S. Computer Science"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From (YYYY-MM)</Label>
                <Input
                  className="h-8 text-sm"
                  value={edu.from}
                  onChange={(e) => update(edu.id, { from: e.target.value })}
                  placeholder="2018-09"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To (YYYY-MM or Present)</Label>
                <Input
                  className="h-8 text-sm"
                  value={edu.to}
                  onChange={(e) => update(edu.id, { to: e.target.value })}
                  placeholder="2022-05"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Achievements / Activities (optional, one per line)</Label>
              <Textarea
                className="text-sm min-h-[60px]"
                value={edu.bullets.join('\n')}
                onChange={(e) => updateBullets(edu.id, e.target.value)}
                placeholder="Dean's List 2020–2022"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={add} className="w-full gap-2">
        <Plus className="h-4 w-4" /> Add Education
      </Button>

      <StepNav onBack={onBack} onNext={onNext} canNext={entries.length > 0} onSkip={onSkip} />
    </div>
  );
};
