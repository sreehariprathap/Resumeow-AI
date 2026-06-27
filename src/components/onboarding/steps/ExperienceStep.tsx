import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { StepNav } from '../shared';
import type { ResumeProfile, Experience } from '@/types/resumeProfile';

const uid = () => crypto.randomUUID();

const emptyExperience = (): Experience => ({
  id: uid(),
  company: '',
  role: '',
  from: '',
  to: '',
  bullets: [''],
});

interface ExperienceStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const ExperienceStep = ({ data, onChange, onNext, onBack, onSkip }: ExperienceStepProps) => {
  const entries = data.experiences ?? [];

  const add = () => onChange({ experiences: [...entries, emptyExperience()] });

  const update = (id: string, patch: Partial<Experience>) =>
    onChange({ experiences: entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const remove = (id: string) =>
    onChange({ experiences: entries.filter((e) => e.id !== id) });

  const updateBullets = (id: string, raw: string) => {
    const bullets = raw.split('\n').filter((b) => b.trim());
    update(id, { bullets: bullets.length ? bullets : [''] });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Add your work experience. Each bullet point on a new line.</p>

      {entries.map((exp, i) => (
        <Card key={exp.id}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Experience {i + 1}</CardTitle>
            <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => remove(exp.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Company</Label>
                <Input
                  className="h-8 text-sm"
                  value={exp.company}
                  onChange={(e) => update(exp.id, { company: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role / Title</Label>
                <Input
                  className="h-8 text-sm"
                  value={exp.role}
                  onChange={(e) => update(exp.id, { role: e.target.value })}
                  placeholder="Software Engineer"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From (YYYY-MM)</Label>
                <Input
                  className="h-8 text-sm"
                  value={exp.from}
                  onChange={(e) => update(exp.id, { from: e.target.value })}
                  placeholder="2022-03"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To (YYYY-MM or Present)</Label>
                <Input
                  className="h-8 text-sm"
                  value={exp.to}
                  onChange={(e) => update(exp.id, { to: e.target.value })}
                  placeholder="2024-06"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bullet Points (one per line)</Label>
              <Textarea
                className="text-sm min-h-[100px]"
                value={exp.bullets.join('\n')}
                onChange={(e) => updateBullets(exp.id, e.target.value)}
                placeholder={"Built REST APIs using Node.js\nReduced latency by 40% through caching"}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={add} className="w-full gap-2">
        <Plus className="h-4 w-4" /> Add Experience
      </Button>

      <StepNav onBack={onBack} onNext={onNext} canNext={entries.length > 0} onSkip={onSkip} />
    </div>
  );
};
