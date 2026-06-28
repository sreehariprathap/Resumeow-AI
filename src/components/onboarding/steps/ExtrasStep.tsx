import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { StepNav } from '../shared';
import { useAIService } from '@/hooks/useAIService';
import type { ResumeProfile, Language, Award, VolunteerEntry } from '@/types/resumeProfile';

interface ExtraCardProps {
  label: string;
  emoji: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

const ExtraCard = ({ label, emoji, open, onToggle, children }: ExtraCardProps) => (
  <Card className={open ? 'border-primary/40' : ''}>
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 text-left"
    >
      <span className="flex items-center gap-2 font-medium text-sm">
        <span>{emoji}</span> {label}
      </span>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          open ? 'bg-primary border-primary' : 'border-muted-foreground'
        }`}
      >
        {open && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
    </button>
    {open && <CardContent className="pt-0 pb-4">{children}</CardContent>}
  </Card>
);

interface ExtrasStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const ExtrasStep = ({ data, onChange, onNext, onBack, onSkip }: ExtrasStepProps) => {
  const { callForTask } = useAIService();
  const [toggles, setToggles] = useState({
    summary: !!data.summary,
    languages: (data.languages?.length ?? 0) > 0,
    awards: (data.awards?.length ?? 0) > 0,
    volunteer: (data.volunteer?.length ?? 0) > 0,
    publications: (data.publications?.length ?? 0) > 0,
  });
  const [genLoading, setGenLoading] = useState(false);

  const toggle = (key: keyof typeof toggles) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const generateSummary = async () => {
    setGenLoading(true);
    try {
      const prompt = `Write a professional resume summary (2-3 sentences) for someone with the following background:
Target roles: ${(data.targetRoles ?? []).join(', ')}
Experience: ${(data.experiences ?? []).map((e) => `${e.role} at ${e.company}`).join('; ')}
Skills: ${(data.skills ?? []).map((s) => `${s.category}: ${s.skills.join(', ')}`).join('; ')}

Output only the summary text, no quotes or labels.`;
      const summary = await callForTask('bioSummary', prompt);
      onChange({ summary });
      toast.success('Summary generated!');
    } catch {
      toast.error('Could not generate summary. Check your AI setup in Settings.');
    } finally {
      setGenLoading(false);
    }
  };

  const languages = data.languages ?? [];
  const awards = data.awards ?? [];
  const volunteer = data.volunteer ?? [];
  const publications = data.publications ?? [];

  const addLanguage = () =>
    onChange({ languages: [...languages, { name: '', proficiency: 'Intermediate' } as Language] });
  const updateLanguage = (i: number, patch: Partial<Language>) =>
    onChange({ languages: languages.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
  const removeLanguage = (i: number) =>
    onChange({ languages: languages.filter((_, idx) => idx !== i) });

  const addAward = () =>
    onChange({ awards: [...awards, { title: '', issuer: '', year: '' } as Award] });
  const updateAward = (i: number, patch: Partial<Award>) =>
    onChange({ awards: awards.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) });
  const removeAward = (i: number) =>
    onChange({ awards: awards.filter((_, idx) => idx !== i) });

  const addVolunteer = () =>
    onChange({ volunteer: [...volunteer, { org: '', role: '', description: '' } as VolunteerEntry] });
  const updateVolunteer = (i: number, patch: Partial<VolunteerEntry>) =>
    onChange({ volunteer: volunteer.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) });
  const removeVolunteer = (i: number) =>
    onChange({ volunteer: volunteer.filter((_, idx) => idx !== i) });

  const addPublication = () => onChange({ publications: [...publications, ''] });
  const updatePublication = (i: number, val: string) =>
    onChange({ publications: publications.map((p, idx) => (idx === i ? val : p)) });
  const removePublication = (i: number) =>
    onChange({ publications: publications.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Toggle optional sections to include in your resume.</p>

      <ExtraCard label="Professional Summary" emoji="✍️" open={toggles.summary} onToggle={() => toggle('summary')}>
        <div className="space-y-2">
          <Textarea
            className="text-sm min-h-[80px]"
            value={data.summary || ''}
            onChange={(e) => onChange({ summary: e.target.value })}
            placeholder="A results-driven software engineer with 4+ years of experience..."
          />
          <Button variant="outline" size="sm" onClick={generateSummary} disabled={genLoading} className="gap-2">
            {genLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate with AI
          </Button>
        </div>
      </ExtraCard>

      <ExtraCard label="Languages" emoji="🌐" open={toggles.languages} onToggle={() => toggle('languages')}>
        <div className="space-y-2">
          {languages.map((l, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                className="h-8 text-sm"
                value={l.name}
                onChange={(e) => updateLanguage(i, { name: e.target.value })}
                placeholder="Spanish"
              />
              <select
                className="h-8 text-sm border rounded-md px-2 bg-background"
                value={l.proficiency}
                onChange={(e) => updateLanguage(i, { proficiency: e.target.value as Language['proficiency'] })}
              >
                {['Native', 'Fluent', 'Intermediate', 'Basic'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <Button variant="ghost" size="icon" className="text-destructive h-7 w-7 shrink-0" onClick={() => removeLanguage(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLanguage} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Language
          </Button>
        </div>
      </ExtraCard>

      <ExtraCard label="Awards & Honors" emoji="🏆" open={toggles.awards} onToggle={() => toggle('awards')}>
        <div className="space-y-2">
          {awards.map((a, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <Input className="h-8 text-sm" value={a.title} onChange={(e) => updateAward(i, { title: e.target.value })} placeholder="Best Paper Award" />
              <Input className="h-8 text-sm" value={a.issuer} onChange={(e) => updateAward(i, { issuer: e.target.value })} placeholder="IEEE" />
              <div className="flex gap-1">
                <Input className="h-8 text-sm" value={a.year} onChange={(e) => updateAward(i, { year: e.target.value })} placeholder="2023" />
                <Button variant="ghost" size="icon" className="text-destructive h-7 w-7 shrink-0" onClick={() => removeAward(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addAward} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Award
          </Button>
        </div>
      </ExtraCard>

      <ExtraCard label="Volunteer Work" emoji="🤝" open={toggles.volunteer} onToggle={() => toggle('volunteer')}>
        <div className="space-y-3">
          {volunteer.map((v, i) => (
            <Card key={i} className="p-3 space-y-2">
              <div className="flex gap-2">
                <Input className="h-8 text-sm flex-1" value={v.org} onChange={(e) => updateVolunteer(i, { org: e.target.value })} placeholder="Organization" />
                <Input className="h-8 text-sm flex-1" value={v.role} onChange={(e) => updateVolunteer(i, { role: e.target.value })} placeholder="Role" />
                <Button variant="ghost" size="icon" className="text-destructive h-7 w-7 shrink-0" onClick={() => removeVolunteer(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input className="h-8 text-sm" value={v.description} onChange={(e) => updateVolunteer(i, { description: e.target.value })} placeholder="Brief description..." />
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={addVolunteer} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Entry
          </Button>
        </div>
      </ExtraCard>

      <ExtraCard label="Publications" emoji="📄" open={toggles.publications} onToggle={() => toggle('publications')}>
        <div className="space-y-2">
          {publications.map((p, i) => (
            <div key={i} className="flex gap-2">
              <Input className="h-8 text-sm flex-1" value={p} onChange={(e) => updatePublication(i, e.target.value)} placeholder="Paper title or URL" />
              <Button variant="ghost" size="icon" className="text-destructive h-7 w-7 shrink-0" onClick={() => removePublication(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addPublication} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Publication
          </Button>
        </div>
      </ExtraCard>

      <StepNav onBack={onBack} onNext={onNext} canNext={true} nextLabel="Continue to Review" onSkip={onSkip} />
    </div>
  );
};
