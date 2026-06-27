import { useState, useEffect } from 'react';
import { generateLatexResume } from '@/lib/resumeGenerator';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  Sparkles,
  FileText,
  Loader2,
  Check,
  CheckCircle,
  Pencil,
} from 'lucide-react';
import { useOnboarding } from '@/lib/onboardingContext';
import { useAIProvider } from '@/lib/aiProviderContext';
import { useAuth } from '@/lib/authContext';
import { saveUserData } from '@/lib/firebaseWeb';
import { toast } from 'sonner';
import { DOMAINS, DOMAIN_ROLES } from '@/data/domainRoles';
import { CERTIFICATIONS } from '@/data/certifications';
import type {
  ResumeProfile,
  Experience,
  Education,
  Project,
  SkillGroup,
  Language,
  Award,
  VolunteerEntry,
} from '@/types/resumeProfile';
import { extractTextFromFile, parseResumeWithAI, mapParsedToProfile } from '@/lib/resumeParser';
import { ResumeDropzone } from './ResumeDropzone';

const uid = () => crypto.randomUUID();

const TOTAL_STEPS = 11;

const defaultProfile = (): Omit<ResumeProfile, 'domain' | 'completedAt'> & { domain?: ResumeProfile['domain'] } => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  website: '',
  domain: undefined,
  targetRoles: [],
  experiences: [],
  education: [],
  projects: [],
  certifications: [],
  skills: [],
  summary: '',
  languages: [],
  awards: [],
  volunteer: [],
  publications: [],
  lastUpdated: Date.now(),
});

// ─── Autofill badge ───────────────────────────────────────────────────────────

const AutofillBadge = () => (
  <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-full mb-4">
    <CheckCircle className="h-3.5 w-3.5" />
    Auto-filled from your resume — review and edit as needed
  </div>
);

// ─── Step -1 — Resume Upload (pre-step) ──────────────────────────────────────

interface ResumeUploadStepProps {
  onParsed: (profile: Partial<ResumeProfile>) => void;
  onSkip: () => void;
}

const ResumeUploadStep = ({ onParsed, onSkip }: ResumeUploadStepProps) => {
  const { makeAICall } = useAIProvider();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedSummary, setParsedSummary] = useState<{
    experiences: number;
    education: number;
    skills: number;
  } | null>(null);
  const [parsed, setParsed] = useState<Partial<ResumeProfile> | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Please use a file under 5MB.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setParsedSummary(null);
    setParsed(null);

    try {
      const text = await extractTextFromFile(file);
      const parsedData = await parseResumeWithAI(text, makeAICall);
      const mapped = mapParsedToProfile(parsedData);
      setParsed(mapped);
      setParsedSummary({
        experiences: parsedData.experiences.length,
        education: parsedData.education.length,
        skills: parsedData.skills.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Parsing failed.';
      setError(`${msg} You can still fill in manually.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center space-y-8 py-8">
      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center">
        <FileText className="h-12 w-12 text-white" />
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-bold">Have a resume ready?</h2>
        <p className="text-muted-foreground max-w-md mx-auto text-base">
          Upload it and we'll fill everything for you. You can edit anything before finishing.
        </p>
      </div>

      <ResumeDropzone
        onFile={handleFile}
        isLoading={isLoading}
        parsedSummary={parsedSummary}
        error={error}
        onContinue={() => parsed && onParsed(parsed)}
      />

      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        Start from scratch instead
      </button>
    </div>
  );
};

// ─── Step 0 — Welcome ───────────────────────────────────────────────────────

const WelcomeStep = ({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) => (
  <div className="text-center space-y-8 py-8">
    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center">
      <FileText className="h-12 w-12 text-white" />
    </div>
    <div className="space-y-3">
      <h2 className="text-3xl font-bold">Let's build your resume</h2>
      <p className="text-muted-foreground max-w-md mx-auto text-base">
        We'll collect your professional details step by step, then use AI to generate a polished LaTeX resume ready to compile on Overleaf.
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-left">
      {[
        { title: 'Guided steps', desc: 'Fill in your info at your own pace, save progress automatically' },
        { title: 'AI-enhanced', desc: 'Bullet points strengthened with action verbs and impact metrics' },
        { title: 'LaTeX output', desc: 'Professional Jake\'s Resume template ready to compile' },
      ].map((f) => (
        <Card key={f.title} className="border">
          <CardContent className="pt-5">
            <p className="font-semibold text-sm">{f.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="flex flex-col items-center gap-2">
      <Button size="lg" onClick={onNext} className="px-10">
        Get Started <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline mt-2"
      >
        Skip for now →
      </button>
    </div>
  </div>
);

// ─── Step 1 — Personal Info ──────────────────────────────────────────────────

interface PersonalInfoStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const PersonalInfoStep = ({ data, onChange, onNext, onBack, onSkip }: PersonalInfoStepProps) => {
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

// ─── Step 2 — Domain ─────────────────────────────────────────────────────────

interface DomainStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const DomainStep = ({ data, onChange, onNext, onBack, onSkip }: DomainStepProps) => (
  <div className="space-y-5">
    <p className="text-sm text-muted-foreground">Select the field that best describes your career focus.</p>
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
    </div>
    <StepNav onBack={onBack} onNext={onNext} canNext={!!data.domain} onSkip={onSkip} />
  </div>
);

// ─── Step 3 — Target Roles ────────────────────────────────────────────────────

interface TargetRolesStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const TargetRolesStep = ({ data, onChange, onNext, onBack, onSkip }: TargetRolesStepProps) => {
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

// ─── Step 4 — Experience ──────────────────────────────────────────────────────

interface ExperienceStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const emptyExperience = (): Experience => ({
  id: uid(),
  company: '',
  role: '',
  from: '',
  to: '',
  bullets: [''],
});

const ExperienceStep = ({ data, onChange, onNext, onBack, onSkip }: ExperienceStepProps) => {
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

// ─── Step 5 — Education ───────────────────────────────────────────────────────

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

const EducationStep = ({ data, onChange, onNext, onBack, onSkip }: EducationStepProps) => {
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

// ─── Step 6 — Projects ────────────────────────────────────────────────────────

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

const ProjectsStep = ({ data, onChange, onNext, onBack, onSkip }: ProjectsStepProps) => {
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

// ─── Step 7 — Certifications ──────────────────────────────────────────────────

interface CertificationsStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const CertificationsStep = ({ data, onChange, onNext, onBack, onSkip }: CertificationsStepProps) => {
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

// ─── Step 8 — Skills ─────────────────────────────────────────────────────────

interface SkillsStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const SkillsStep = ({ data, onChange, onNext, onBack, onSkip }: SkillsStepProps) => {
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
          <div className="grid grid-cols-2 gap-3">
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

// ─── Step 9 — Extras ─────────────────────────────────────────────────────────

interface ExtrasStepProps {
  data: Partial<ResumeProfile>;
  onChange: (updates: Partial<ResumeProfile>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const ExtrasStep = ({ data, onChange, onNext, onBack, onSkip }: ExtrasStepProps) => {
  const { makeAICall } = useAIProvider();
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
      const summary = await makeAICall(prompt);
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

      {/* Professional Summary */}
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

      {/* Languages */}
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

      {/* Awards */}
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

      {/* Volunteer */}
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

      {/* Publications */}
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

interface ExtraCardProps {
  label: string;
  emoji: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
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

// ─── Step 10 — Review + Generate ─────────────────────────────────────────────

interface ReviewStepProps {
  data: Partial<ResumeProfile>;
  onBack: () => void;
  onGenerate: () => void;
  onSkipToFinish: () => void;
  isGenerating: boolean;
  onEditStep: (step: number) => void;
  skippedSteps: Set<number>;
}

const SkippedWarningCard = ({
  stepIndex,
  label,
  onGoToStep,
}: {
  stepIndex: number;
  label: string;
  onGoToStep: (s: number) => void;
}) => (
  <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
    <span>Not filled in yet</span>
    <button
      onClick={() => onGoToStep(stepIndex)}
      className="text-xs hover:text-foreground underline-offset-2 hover:underline"
    >
      Add {label} later →
    </button>
  </div>
);

const ReviewStep = ({ data, onBack, onGenerate, onSkipToFinish, isGenerating, onEditStep, skippedSteps }: ReviewStepProps) => {
  const domainLabel = DOMAINS.find((d) => d.id === data.domain)?.label ?? '—';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review your profile below. Click Edit on any section to make changes.</p>

      {/* Personal Info */}
      {skippedSteps.has(1) && !data.firstName ? (
        <SkippedWarningCard stepIndex={1} label="Personal Info" onGoToStep={onEditStep} />
      ) : (
        <ReviewCard title="Personal Info" onEdit={() => onEditStep(1)}>
          <p className="text-sm font-medium">{data.firstName} {data.lastName}</p>
          <p className="text-xs text-muted-foreground">{data.email} · {data.phone}</p>
          <p className="text-xs text-muted-foreground">{data.location}</p>
          {data.linkedin && <p className="text-xs text-muted-foreground">{data.linkedin}</p>}
        </ReviewCard>
      )}

      {/* Domain & Roles */}
      {skippedSteps.has(2) && !data.domain ? (
        <SkippedWarningCard stepIndex={2} label="Domain & Target Roles" onGoToStep={onEditStep} />
      ) : (
        <ReviewCard title="Domain & Target Roles" onEdit={() => onEditStep(2)}>
          <p className="text-sm font-medium">{domainLabel}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {(data.targetRoles ?? []).map((r) => (
              <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
            ))}
          </div>
        </ReviewCard>
      )}

      {/* Experience */}
      {skippedSteps.has(4) && (data.experiences?.length ?? 0) === 0 ? (
        <SkippedWarningCard stepIndex={4} label="Experience" onGoToStep={onEditStep} />
      ) : (data.experiences?.length ?? 0) > 0 && (
        <ReviewCard title={`Experience (${data.experiences!.length})`} onEdit={() => onEditStep(4)}>
          <div className="space-y-3">
            {data.experiences!.map((exp) => (
              <div key={exp.id} className="space-y-1">
                <p className="text-sm font-medium">{exp.role} @ {exp.company}</p>
                <p className="text-xs text-muted-foreground">{exp.from} – {exp.to}</p>
                {exp.bullets.slice(0, 2).map((b, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-2 border-l border-border">• {b}</p>
                ))}
                {exp.bullets.length > 2 && (
                  <p className="text-xs text-muted-foreground pl-2">+{exp.bullets.length - 2} more</p>
                )}
              </div>
            ))}
          </div>
        </ReviewCard>
      )}

      {/* Education */}
      {skippedSteps.has(5) && (data.education?.length ?? 0) === 0 ? (
        <SkippedWarningCard stepIndex={5} label="Education" onGoToStep={onEditStep} />
      ) : (data.education?.length ?? 0) > 0 && (
        <ReviewCard title={`Education (${data.education!.length})`} onEdit={() => onEditStep(5)}>
          <div className="space-y-2">
            {data.education!.map((edu) => (
              <div key={edu.id}>
                <p className="text-sm font-medium">{edu.degree}</p>
                <p className="text-xs text-muted-foreground">{edu.school} · {edu.from} – {edu.to}</p>
              </div>
            ))}
          </div>
        </ReviewCard>
      )}

      {/* Projects */}
      {skippedSteps.has(6) && (data.projects?.length ?? 0) === 0 ? (
        <SkippedWarningCard stepIndex={6} label="Projects" onGoToStep={onEditStep} />
      ) : (data.projects?.length ?? 0) > 0 && (
        <ReviewCard title={`Projects (${data.projects!.length})`} onEdit={() => onEditStep(6)}>
          <div className="space-y-1">
            {data.projects!.map((p) => (
              <div key={p.id}>
                <p className="text-sm font-medium">{p.name}</p>
                {p.skills.length > 0 && (
                  <p className="text-xs text-muted-foreground">{p.skills.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </ReviewCard>
      )}

      {/* Skills */}
      {skippedSteps.has(8) && (data.skills?.length ?? 0) === 0 ? (
        <SkippedWarningCard stepIndex={8} label="Skills" onGoToStep={onEditStep} />
      ) : (data.skills?.length ?? 0) > 0 && (
        <ReviewCard title={`Skills (${data.skills!.length} groups)`} onEdit={() => onEditStep(8)}>
          <div className="space-y-1">
            {data.skills!.map((g, i) => (
              <p key={i} className="text-xs">
                <span className="font-medium">{g.category}:</span>{' '}
                <span className="text-muted-foreground">{g.skills.join(', ')}</span>
              </p>
            ))}
          </div>
        </ReviewCard>
      )}

      {/* Certifications */}
      {(data.certifications?.length ?? 0) > 0 && (
        <ReviewCard title={`Certifications (${data.certifications!.length})`} onEdit={() => onEditStep(7)}>
          <div className="flex flex-wrap gap-1">
            {data.certifications!.map((c) => (
              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
            ))}
          </div>
        </ReviewCard>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-1" disabled={isGenerating}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button className="flex-1 gap-2" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating Resume...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Complete Onboarding & Go to Dashboard →</>
          )}
        </Button>
      </div>
      <div className="flex justify-center pt-1">
        <button
          onClick={onSkipToFinish}
          disabled={isGenerating}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:pointer-events-none"
        >
          Looks good, finish without reviewing →
        </button>
      </div>
    </div>
  );
};

interface ReviewCardProps {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}

const ReviewCard = ({ title, onEdit, children }: ReviewCardProps) => (
  <Card>
    <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
      >
        <Pencil className="h-3 w-3" /> Edit
      </Button>
    </CardHeader>
    <CardContent className="pt-0">{children}</CardContent>
  </Card>
);

// ─── Navigation helper ────────────────────────────────────────────────────────

interface StepNavProps {
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  nextLabel?: string;
  onSkip?: () => void;
}

const StepNav = ({ onBack, onNext, canNext, nextLabel = 'Continue', onSkip }: StepNavProps) => (
  <div className="space-y-1 pt-2">
    <div className="flex gap-3">
      <Button variant="ghost" onClick={onBack} className="gap-1">
        <ChevronLeft className="h-4 w-4" /> Back
      </Button>
      <Button className="flex-1 gap-1" onClick={onNext} disabled={!canNext}>
        {nextLabel} <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
    {onSkip && (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline mt-2"
        >
          Skip for now →
        </button>
      </div>
    )}
  </div>
);

// ─── STEP LABELS ─────────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Welcome',
  'Personal Info',
  'Domain',
  'Target Roles',
  'Experience',
  'Education',
  'Projects',
  'Certifications',
  'Skills',
  'Extras',
  'Review & Generate',
];

// ─── Main Wizard ──────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { showOnboarding, completeOnboarding, resumeProfile: savedProfile, initialStep, isFirstLogin } = useOnboarding();
  const { makeAICall } = useAIProvider();
  const { currentUser } = useAuth();

  const [step, setStep] = useState(() => (isFirstLogin ? -1 : (initialStep ?? 0)));
  const [profile, setProfile] = useState<Partial<ResumeProfile>>(
    savedProfile ?? defaultProfile()
  );
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLatex, setGeneratedLatex] = useState<string | null>(null);
  const [wasAutofilled, setWasAutofilled] = useState(false);
  const [reviewJump, setReviewJump] = useState(false);

  useEffect(() => {
    if (isFirstLogin) {
      setStep(-1);
    } else if (initialStep !== undefined && initialStep > 0) {
      setStep(initialStep);
    }
  }, [isFirstLogin, initialStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateProfile = (updates: Partial<ResumeProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const handleParsedResume = (mapped: Partial<ResumeProfile>) => {
    setProfile((prev) => ({ ...prev, ...mapped }));
    setWasAutofilled(true);
    setStep(0);
    toast.success('Resume auto-filled! Review and edit each section.');
  };

  const saveProgress = async (nextStep: number, patch?: Partial<ResumeProfile>) => {
    if (!currentUser) return;
    const updated = {
      ...profile,
      ...(patch ?? {}),
      currentStep: nextStep,
      lastUpdated: Date.now(),
      skippedSteps: Array.from(skippedSteps),
    };
    setProfile(updated);
    try {
      await saveUserData(currentUser.uid, 'resumeProfile', updated as Record<string, unknown>);
    } catch {
      // non-critical
    }
  };

  const goNext = async (patch?: Partial<ResumeProfile>) => {
    const next = step + 1;
    await saveProgress(next, patch);
    setStep(next);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo(0, 0);
  };

  const handleSkip = async (stepNum: number) => {
    const newSkipped = new Set(skippedSteps);
    newSkipped.add(stepNum);
    setSkippedSteps(newSkipped);
    const next = step + 1;
    if (currentUser) {
      const updated = {
        ...profile,
        currentStep: next,
        lastUpdated: Date.now(),
        skippedSteps: Array.from(newSkipped),
      };
      setProfile(updated as Partial<ResumeProfile>);
      try {
        await saveUserData(currentUser.uid, 'resumeProfile', updated as Record<string, unknown>);
      } catch {
        // non-critical
      }
    }
    setStep(next);
    window.scrollTo(0, 0);
  };

  const handleEditFromReview = (targetStep: number) => {
    setReviewJump(true);
    setStep(targetStep);
    window.scrollTo(0, 0);
  };

  const returnToReview = () => {
    setReviewJump(false);
    setStep(10);
    window.scrollTo(0, 0);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const latex = await generateLatexResume(profile as ResumeProfile, makeAICall);
      setGeneratedLatex(latex);

      const finalProfile = {
        ...profile,
        completedAt: Date.now(),
        lastUpdated: Date.now(),
        currentStep: TOTAL_STEPS,
        skippedSteps: Array.from(skippedSteps),
      };

      if (currentUser) {
        await saveUserData(currentUser.uid, 'resumeProfile', finalProfile as Record<string, unknown>);
      }

      sessionStorage.setItem('generatedLatex', latex);

      completeOnboarding();
      onComplete?.();
      window.location.href = '/resume';
    } catch (err) {
      console.error(err);
      toast.error('Resume generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSkipToFinish = async () => {
    setIsGenerating(true);
    try {
      const finalProfile = {
        ...profile,
        completedAt: Date.now(),
        lastUpdated: Date.now(),
        currentStep: TOTAL_STEPS,
        skippedSteps: Array.from(skippedSteps),
      };
      if (currentUser) {
        await saveUserData(currentUser.uid, 'resumeProfile', finalProfile as Record<string, unknown>);
        await saveUserData(currentUser.uid, 'onboarding', { completed: true, completedAt: Date.now() });
      }
      completeOnboarding();
      onComplete?.();
      window.location.href = '/';
    } catch (e) {
      console.error('Failed to finish onboarding:', e);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!showOnboarding) return null;

  const progressPct = step <= 0 ? 0 : (step / (TOTAL_STEPS - 1)) * 100;

  const autofillSteps = [1, 4, 5, 6, 7, 8];

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 min-h-full">
        {/* Header / progress */}
        {step > 0 && (
          <div className="mb-8 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-2">
                {STEP_LABELS[step]}
                {skippedSteps.has(step) && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Skipped
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">Step {step} of {TOTAL_STEPS - 1}</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}

        {/* Autofill resume banner shown at step 0 after upload */}
        {step === 0 && wasAutofilled && (
          <div className="mb-6 flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-2.5 rounded-lg">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Your resume was auto-filled — review and edit below as you go through each step.
          </div>
        )}

        {/* Autofill badge for data-heavy steps */}
        {wasAutofilled && autofillSteps.includes(step) && <AutofillBadge />}

        {/* Steps */}
        {step === -1 && (
          <ResumeUploadStep
            onParsed={handleParsedResume}
            onSkip={() => setStep(0)}
          />
        )}

        {step === 0 && (
          <WelcomeStep
            onNext={() => setStep(1)}
            onSkip={() => handleSkip(0)}
          />
        )}

        {step === 1 && (
          <PersonalInfoStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(1)}
          />
        )}

        {step === 2 && (
          <DomainStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(2)}
          />
        )}

        {step === 3 && (
          <TargetRolesStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(3)}
          />
        )}

        {step === 4 && (
          <ExperienceStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(4)}
          />
        )}

        {step === 5 && (
          <EducationStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(5)}
          />
        )}

        {step === 6 && (
          <ProjectsStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(6)}
          />
        )}

        {step === 7 && (
          <CertificationsStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(7)}
          />
        )}

        {step === 8 && (
          <SkillsStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(8)}
          />
        )}

        {step === 9 && (
          <ExtrasStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(9)}
          />
        )}

        {step === 10 && (
          <ReviewStep
            data={profile}
            onBack={goBack}
            onGenerate={handleGenerate}
            onSkipToFinish={handleSkipToFinish}
            isGenerating={isGenerating}
            onEditStep={handleEditFromReview}
            skippedSteps={skippedSteps}
          />
        )}

        {/* "Back to Review" overlay */}
        {reviewJump && step !== 10 && (
          <div className="mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={returnToReview}
              className="w-full gap-2"
            >
              <CheckCircle className="h-4 w-4" /> Done editing — back to Review
            </Button>
          </div>
        )}

        {generatedLatex && (
          <div className="mt-6 p-4 bg-muted rounded-lg text-center space-y-2">
            <p className="text-sm font-medium">Resume generated! Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  );
}
