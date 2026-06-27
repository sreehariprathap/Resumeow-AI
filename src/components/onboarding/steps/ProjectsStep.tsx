import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { StepNav } from '../shared';
import type { ResumeProfile, Project } from '@/types/resumeProfile';

const uid = () => crypto.randomUUID();

const emptyProject = (): Project => ({
  id: uid(),
  name: '',
  description: '',
  skills: [],
});

interface ProjectsStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const ProjectsStep = ({ data, onChange, onNext, onBack, onSkip }: ProjectsStepProps) => {
  const entries = data.projects ?? [];

  const add = () => onChange({ projects: [...entries, emptyProject()] });

  const update = (id: string, patch: Partial<Project>) =>
    onChange({ projects: entries.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const remove = (id: string) =>
    onChange({ projects: entries.filter((p) => p.id !== id) });

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Add notable projects. Comma-separate the skills used.</p>

      {entries.map((proj, i) => (
        <Card key={proj.id}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Project {i + 1}</CardTitle>
            <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => remove(proj.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Project Name</Label>
              <Input
                className="h-8 text-sm"
                value={proj.name}
                onChange={(e) => update(proj.id, { name: e.target.value })}
                placeholder="Personal Portfolio"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                className="text-sm min-h-[70px]"
                value={proj.description}
                onChange={(e) => update(proj.id, { description: e.target.value })}
                placeholder="Built a portfolio site with Next.js and deployed on Vercel..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Skills used (comma-separated)</Label>
              <Input
                className="h-8 text-sm"
                value={proj.skills.join(', ')}
                onChange={(e) =>
                  update(proj.id, {
                    skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="React, TypeScript, Tailwind CSS"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={add} className="w-full gap-2">
        <Plus className="h-4 w-4" /> Add Project
      </Button>

      <StepNav onBack={onBack} onNext={onNext} canNext={true} onSkip={onSkip} />
    </div>
  );
};
