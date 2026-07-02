import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { StepNav } from '../shared';
import type { ResumeProfile, SkillGroup } from '@/types/resumeProfile';

interface SkillsStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const SkillsStep = ({ data, onChange, onNext, onBack, onSkip }: SkillsStepProps) => {
  const groups = data.skills ?? [];
  const [catInput, setCatInput] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  const addGroup = () => {
    const cat = catInput.trim();
    const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (!cat || skills.length === 0) return;
    onChange({ skills: [...groups, { category: cat, skills }] });
    setCatInput('');
    setSkillsInput('');
  };

  const remove = (idx: number) => {
    onChange({ skills: groups.filter((_, i) => i !== idx) });
  };

  const updateGroup = (idx: number, patch: Partial<SkillGroup>) => {
    onChange({ skills: groups.map((g, i) => (i === idx ? { ...g, ...patch } : g)) });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Add skill categories (e.g. "Languages") and comma-separated skills (e.g. "Python, TypeScript").
      </p>

      {groups.map((g, i) => (
        <Card key={i}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                className="h-8 text-sm font-medium"
                value={g.category}
                onChange={(e) => updateGroup(i, { category: e.target.value })}
              />
              <Button variant="ghost" size="icon" className="text-destructive h-7 w-7 shrink-0" onClick={() => remove(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              className="h-8 text-sm"
              value={g.skills.join(', ')}
              onChange={(e) =>
                updateGroup(i, { skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
              }
            />
          </CardContent>
        </Card>
      ))}

      <Card className="border-dashed">
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category name</Label>
              <Input
                className="h-8 text-sm"
                value={catInput}
                onChange={(e) => setCatInput(e.target.value)}
                placeholder="Languages"
                onKeyDown={(e) => e.key === 'Enter' && addGroup()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Skills (comma-separated)</Label>
              <Input
                className="h-8 text-sm"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Python, TypeScript, Go"
                onKeyDown={(e) => e.key === 'Enter' && addGroup()}
              />
            </div>
          </div>
          <Button variant="outline" onClick={addGroup} className="w-full gap-2" size="sm">
            <Plus className="h-3.5 w-3.5" /> Add Skill Group
          </Button>
        </CardContent>
      </Card>

      <StepNav onBack={onBack} onNext={onNext} canNext={groups.length > 0} onSkip={onSkip} />
    </div>
  );
};
