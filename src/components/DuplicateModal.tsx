import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronLeft, Copy, CheckCircle2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { RESUME_TEMPLATES, fetchTemplateTex } from '@/lib/templateRegistry';
import type { SavedResume } from '@/lib/firebaseWeb';
import type { ResumeProfile } from '@/types/resumeProfile';

type Step = 'pick-template' | 'name';

interface SelectedTemplate {
  id: string;
  label: string;
  tex?: string; // custom-pasted or fetched
}

interface DuplicateModalProps {
  sourceResume: SavedResume | null;
  profile: ResumeProfile | null;
  onClose: () => void;
  /** Called after generation — parent appends the new resume to the grid */
  onGenerated: (name: string, latex: string, templateId: string, templateLabel: string) => Promise<void>;
  callForTask: (task: 'resumeLatex', prompt: string) => Promise<string>;
}

/** Build the duplicate/reflow prompt */
function buildDuplicatePrompt(
  sourceLatex: string,
  targetTemplateTex: string,
  profile: ResumeProfile | null
): string {
  const profileSection = profile
    ? `\nUSER PROFILE (source of truth for all content):\n${JSON.stringify(profile, null, 2)}`
    : '';

  return `You are a professional resume writer. Your task is to reflow an existing resume into a new LaTeX template, preserving all content exactly.

SOURCE RESUME CONTENT (extract all data from this):
${sourceLatex}
${profileSection}

TARGET TEMPLATE (the exact LaTeX structure to fill in):
${targetTemplateTex}

INSTRUCTIONS:
1. Extract EVERY piece of content from the source resume — name, contact info, all experiences, education, skills, projects, certifications, summary, languages, awards, etc.
2. Map that content into the TARGET TEMPLATE structure faithfully — do NOT omit any section that exists in the source.
3. CRITICAL: Preserve all LaTeX commands, packages, macros, and document structure from the TARGET TEMPLATE exactly. Never use packages or macros from the source template.
4. If the target template has a section the source does not have data for, remove that section from the output.
5. If the source has content the target template has no dedicated section for, add it as a clean additional section using the target's styling conventions.
6. Strengthen all bullet points: action verbs, quantify impact where logical, keep factual.
7. Match the date format used in the TARGET TEMPLATE.
8. Output ONLY the raw, compilable LaTeX code — no markdown fences, no explanation, no comments.

Generate the complete filled LaTeX document now:`;
}

export function DuplicateModal({
  sourceResume, profile, onClose, onGenerated, callForTask,
}: DuplicateModalProps) {
  const [step, setStep] = useState<Step>('pick-template');
  const [selected, setSelected] = useState<SelectedTemplate | null>(null);
  const [customTex, setCustomTex] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [generating, setGenerating] = useState(false);

  const reset = () => {
    setStep('pick-template');
    setSelected(null);
    setCustomTex('');
    setShowCustomInput(false);
    setNewName('');
    setGenerating(false);
  };

  const handleSelectBuiltIn = async (t: { id: string; label: string; texUrl: string }) => {
    setSelected({ id: t.id, label: t.label });
    setShowCustomInput(false);
    setStep('name');
    setNewName(sourceResume ? `${sourceResume.name} — ${t.label}` : `Duplicate — ${t.label}`);
  };

  const handleApplyCustom = () => {
    if (!customTex.trim()) { toast.error('Paste your LaTeX template first'); return; }
    setSelected({ id: 'custom', label: 'Custom Template', tex: customTex.trim() });
    setStep('name');
    setNewName(sourceResume ? `${sourceResume.name} — Custom` : 'Duplicate — Custom');
  };

  const handleGenerate = async () => {
    if (!sourceResume || !selected) return;
    if (!newName.trim()) { toast.error('Enter a name for the duplicate'); return; }

    setGenerating(true);
    try {
      // Fetch template tex if not already available (custom already has it)
      let templateTex = selected.tex ?? '';
      if (!templateTex) {
        const builtIn = RESUME_TEMPLATES.find(t => t.id === selected.id);
        if (builtIn) {
          templateTex = await fetchTemplateTex(builtIn.texUrl);
        }
      }

      if (!templateTex) throw new Error('Could not load template source');

      const prompt = buildDuplicatePrompt(sourceResume.latex, templateTex, profile);
      const latex = await callForTask('resumeLatex', prompt);

      await onGenerated(newName.trim(), latex, selected.id, selected.label);
      toast.success(`"${newName.trim()}" created!`);
      reset();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={!!sourceResume} onOpenChange={o => { if (!o && !generating) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            {step === 'name' && (
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setStep('pick-template')}
                disabled={generating}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {step === 'pick-template' ? 'Duplicate — Pick a Template' : 'Name Your Duplicate'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {step === 'pick-template'
                  ? `Duplicating "${sourceResume?.name ?? 'resume'}" — pick a template to reflow it into`
                  : `Reflowing "${sourceResume?.name ?? 'resume'}" → ${selected?.label}`}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Pick template */}
        {step === 'pick-template' && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Built-in templates grid */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Built-in Templates
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {RESUME_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => void handleSelectBuiltIn(t)}
                    className={[
                      'group relative rounded-xl border-2 overflow-hidden text-left transition-all duration-200',
                      'hover:border-primary hover:shadow-lg hover:shadow-primary/10',
                      selected?.id === t.id
                        ? 'border-primary shadow-md shadow-primary/20'
                        : 'border-border/50 bg-card',
                    ].join(' ')}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[3/4] overflow-hidden bg-muted/30">
                      <img
                        src={t.previewUrl}
                        alt={t.label}
                        className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    {/* Label */}
                    <div className="px-3 py-2.5 flex items-center justify-between">
                      <span className="text-sm font-medium">{t.label}</span>
                      {selected?.id === t.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom template upload */}
            <div className="border border-dashed border-border rounded-xl p-4">
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                onClick={() => setShowCustomInput(v => !v)}
              >
                <Upload className="h-4 w-4 shrink-0" />
                <span className="font-medium">Upload your own LaTeX template</span>
              </button>

              {showCustomInput && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Paste a complete, valid <code>.tex</code> file. The AI will reflow your resume content into it.
                  </p>
                  <Textarea
                    value={customTex}
                    onChange={e => setCustomTex(e.target.value)}
                    placeholder="\documentclass{article}..."
                    className="font-mono text-xs min-h-[180px]"
                    spellCheck={false}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleApplyCustom} className="gap-1.5">
                      <Copy className="h-3.5 w-3.5" /> Use This Template
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setCustomTex(''); setShowCustomInput(false); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Name + confirm */}
        {step === 'name' && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Selected template preview strip */}
            {selected && selected.id !== 'custom' && (() => {
              const t = RESUME_TEMPLATES.find(tmpl => tmpl.id === selected.id);
              return t ? (
                <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-muted/20">
                  <img
                    src={t.previewUrl}
                    alt={t.label}
                    className="h-16 w-12 object-cover object-top rounded-md border border-border shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold">{t.label}</p>
                    <p className="text-xs text-muted-foreground">Selected template</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto shrink-0" />
                </div>
              ) : null;
            })()}

            {selected?.id === 'custom' && (
              <div className="flex items-center gap-4 p-3 rounded-xl border border-primary/30 bg-primary/5">
                <Upload className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Custom Template</p>
                  <p className="text-xs text-muted-foreground">
                    {customTex.split('\n').length} lines of LaTeX
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto shrink-0" />
              </div>
            )}

            {/* Name input */}
            <div className="space-y-2">
              <Label htmlFor="dup-resume-name">Resume name</Label>
              <Input
                id="dup-resume-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Google SWE 2025 — John Snow"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && !generating && void handleGenerate()}
              />
              <p className="text-xs text-muted-foreground">
                Give this duplicate a meaningful name to distinguish it in your resume list.
              </p>
            </div>

            {/* What will happen */}
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-foreground">What happens next</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>AI extracts all content from <strong>"{sourceResume?.name}"</strong></li>
                <li>Reflowing it into the <strong>{selected?.label}</strong> template structure</li>
                <li>Strengthens bullet points with action verbs &amp; impact</li>
                <li>Saves the new resume to your library as <strong>"{newName || '…'}"</strong></li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0">
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} disabled={generating}>
            Cancel
          </Button>
          {step === 'name' && (
            <Button
              onClick={() => void handleGenerate()}
              disabled={generating || !newName.trim()}
              className="gap-2 min-w-[140px]"
            >
              {generating
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                : <><Copy className="h-4 w-4" /> Generate Duplicate</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
