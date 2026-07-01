import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Copy, Download, ExternalLink, RefreshCw, Loader2, Pencil,
  FileText, Upload, Plus, Eye, Trash2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAIService } from '@/hooks/useAIService';
import { useAuth } from '@/lib/authContext';
import { getUserData, saveUserData } from '@/lib/firebaseWeb';
import {
  getSavedResumes, saveResume, updateResumeLatex, deleteResume,
  type SavedResume,
} from '@/lib/firebaseWeb';
import { generateLatexResume } from '@/lib/resumeGenerator';
import { extractTextFromFile, parseResumeWithAI, mapParsedToProfile } from '@/lib/resumeParser';
import { RESUME_TEMPLATES, fetchTemplateTex } from '@/lib/templateRegistry';
import { ResumeDropzone } from '@/components/ResumeDropzone';
import { ResumeEditorModal } from '@/components/ResumeEditorModal';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';
import { DuplicateModal } from '@/components/DuplicateModal';
import type { ResumeProfile } from '@/types/resumeProfile';
import { useOnboarding } from '@/lib/onboardingContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 2)   return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

// ── Resume card ──────────────────────────────────────────────────────────────

interface ResumeCardProps {
  resume: SavedResume;
  onEdit:      (r: SavedResume) => void;
  onPreview:   (r: SavedResume) => void;
  onDuplicate: (r: SavedResume) => void;
  onDelete:    (r: SavedResume) => void;
}

function ResumeCard({ resume, onEdit, onPreview, onDuplicate, onDelete }: ResumeCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(resume.latex)
      .then(() => toast.success('LaTeX copied'))
      .catch(() => toast.error('Copy failed'));
  };

  const handleDownload = () => {
    const blob = new Blob([resume.latex], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${resume.name.replace(/\s+/g, '_')}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />

      {/* Card body */}
      <div className="flex-1 p-5 space-y-4">
        {/* Title + template badge */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-tight line-clamp-2 flex-1">{resume.name}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs gap-1">
              <FileText className="h-3 w-3" />
              {resume.templateLabel}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelative(resume.updatedAt)}
            </span>
          </div>
        </div>

        {/* LaTeX snippet preview */}
        <div className="rounded-lg bg-muted/40 border border-border/30 px-3 py-2 overflow-hidden max-h-24">
          <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-all line-clamp-5">
            {resume.latex.slice(0, 300)}
          </pre>
        </div>
      </div>

      {/* Action footer */}
      <div className="border-t border-border/40 px-4 py-3 flex items-center gap-1.5 flex-wrap bg-muted/20">
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary"
          onClick={() => onPreview(resume)}>
          <Eye className="h-3 w-3" /> Preview
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5"
          onClick={() => onEdit(resume)}>
          <Pencil className="h-3 w-3" /> Edit
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5"
          onClick={() => onDuplicate(resume)}>
          <Copy className="h-3 w-3" /> Duplicate
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={handleCopy}>
          <Copy className="h-3 w-3" /> Copy LaTeX
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={handleDownload}>
          <Download className="h-3 w-3" /> .tex
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={`h-7 text-xs gap-1.5 ml-auto ${confirmDelete ? 'text-destructive hover:text-destructive' : 'text-muted-foreground'}`}
          onClick={() => {
            if (confirmDelete) { onDelete(resume); }
            else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
          }}
        >
          <Trash2 className="h-3 w-3" />
          {confirmDelete ? 'Confirm delete' : ''}
        </Button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ResumeGeneratorPage() {
  const { callForTask } = useAIService();
  const { currentUser } = useAuth();
  const { startOnboarding } = useOnboarding();
  const [searchParams, setSearchParams] = useSearchParams();

  const [resumes, setResumes]         = useState<SavedResume[]>([]);
  const [profile, setProfile]         = useState<ResumeProfile | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Dialogs
  const [editingResume, setEditingResume] = useState<SavedResume | null>(null);
  const [previewResume, setPreviewResume]       = useState<SavedResume | null>(null);
  const [duplicatingResume, setDuplicatingResume] = useState<SavedResume | null>(null);

  // Generate new resume panel
  const [showGenPanel, setShowGenPanel]     = useState(false);
  const [genTemplateId, setGenTemplateId]   = useState(RESUME_TEMPLATES[0].id);
  const [genName, setGenName]               = useState('');

  // Upload dialog
  const [uploadOpen, setUploadOpen]         = useState(false);
  const [isUploading, setIsUploading]       = useState(false);
  const [uploadError, setUploadError]       = useState<string | null>(null);
  const [uploadSummary, setUploadSummary]   = useState<{ experiences: number; education: number; skills: number } | null>(null);

  // Load resumes and profile
  useEffect(() => {
    let isMounted = true;
    if (!currentUser) { setIsLoading(false); return; }

    const fetchData = async () => {
      try {
        const [savedList, prof] = await Promise.all([
          getSavedResumes(currentUser.uid).catch(() => []),
          getUserData(currentUser.uid, 'resumeProfile').catch(() => null),
        ]);
        const sortedResumes = savedList.sort((a, b) => b.updatedAt - a.updatedAt);
        
        // Migrate any legacy sessionStorage resume into Firestore
        const legacyLatex = sessionStorage.getItem('generatedLatex');
        const legacyTplId = sessionStorage.getItem('selectedTemplateId') ?? RESUME_TEMPLATES[0].id;
        if (legacyLatex && savedList.length === 0) {
          const tpl = RESUME_TEMPLATES.find(t => t.id === legacyTplId);
          const now = Date.now();
          const newId = await saveResume(currentUser.uid, {
            name: 'My Resume',
            latex: legacyLatex,
            templateId: legacyTplId,
            templateLabel: tpl?.label ?? legacyTplId,
            createdAt: now,
            updatedAt: now,
          }).catch(() => null);
          if (newId) {
            sessionStorage.removeItem('generatedLatex');
            const migrated: SavedResume = {
              id: newId,
              name: 'My Resume',
              latex: legacyLatex,
              templateId: legacyTplId,
              templateLabel: tpl?.label ?? legacyTplId,
              createdAt: now,
              updatedAt: now,
            };
            if (isMounted) {
              setResumes([migrated]);
              setProfile(prof as ResumeProfile);
              setIsLoading(false);
            }
            return;
          }
        }
        if (isMounted) {
          setProfile(prof as ResumeProfile);
          setResumes(sortedResumes);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          toast.error('Failed to load data');
          setIsLoading(false);
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [currentUser]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && resumes.length > 0) {
      const target = resumes.find(r => r.id === editId);
      if (target && !editingResume) {
        setEditingResume(target);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, resumes, editingResume, setSearchParams]);

  // Generate a brand-new resume
  const handleGenerate = async () => {
    if (!profile) { toast.error('Build your profile first'); return; }
    if (!genName.trim()) { toast.error('Give this resume a name'); return; }
    if (!currentUser) return;

    setIsGenerating(true);
    try {
      const template = RESUME_TEMPLATES.find(t => t.id === genTemplateId);
      const templateTex = template ? await fetchTemplateTex(template.texUrl) : undefined;
      const latex = await generateLatexResume(
        profile,
        (prompt) => callForTask('resumeLatex', prompt),
        templateTex,
      );
      const now = Date.now();
      const id = await saveResume(currentUser.uid, {
        name: genName.trim(),
        latex,
        templateId: genTemplateId,
        templateLabel: template?.label ?? genTemplateId,
        createdAt: now,
        updatedAt: now,
      });
      const newResume: SavedResume = {
        id, name: genName.trim(), latex,
        templateId: genTemplateId,
        templateLabel: template?.label ?? genTemplateId,
        createdAt: now, updatedAt: now,
      };
      setResumes(prev => [newResume, ...prev]);
      setGenName('');
      setShowGenPanel(false);
      toast.success(`"${genName.trim()}" generated!`);
    } catch {
      toast.error('Generation failed. Check your AI settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save edits from editor modal
  const handleSaveEdit = useCallback(async (resumeId: string, name: string, latex: string) => {
    if (!currentUser) return;
    await updateResumeLatex(currentUser.uid, resumeId, latex, name);
    setResumes(prev => prev.map(r =>
      r.id === resumeId ? { ...r, name, latex, updatedAt: Date.now() } : r
    ));
  }, [currentUser]);

  // Append generated duplicate to grid
  const handleDuplicateGenerated = useCallback(async (
    name: string, latex: string, templateId: string, templateLabel: string
  ) => {
    if (!currentUser) return;
    const now = Date.now();
    const id = await saveResume(currentUser.uid, { name, latex, templateId, templateLabel, createdAt: now, updatedAt: now });
    setResumes(prev => [{ id, name, latex, templateId, templateLabel, createdAt: now, updatedAt: now }, ...prev]);
  }, [currentUser]);

  // Delete resume
  const handleDelete = useCallback(async (r: SavedResume) => {
    if (!currentUser) return;
    await deleteResume(currentUser.uid, r.id).catch(() => null);
    setResumes(prev => prev.filter(x => x.id !== r.id));
    toast.success(`"${r.name}" deleted`);
  }, [currentUser]);

  // File upload handler (same as before)
  const handleUploadFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setUploadError('File too large (max 5MB)'); return; }
    setIsUploading(true); setUploadError(null); setUploadSummary(null);
    try {
      const text = await extractTextFromFile(file);
      const parsed = await parseResumeWithAI(text, (prompt) => callForTask('resumeParse', prompt));
      const mapped = mapParsedToProfile(parsed);
      setUploadSummary({ experiences: parsed.experiences.length, education: parsed.education.length, skills: parsed.skills.length });
      const updated = { ...(profile ?? {}), ...mapped } as ResumeProfile;
      setProfile(updated);
      if (currentUser) await saveUserData(currentUser.uid, 'resumeProfile', updated as Record<string, unknown>);
      toast.success('Profile updated from uploaded resume');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Parsing failed');
    } finally {
      setIsUploading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading your resumes…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-2">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Resumes</h1>
          {profile && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {profile.firstName} {profile.lastName} · {profile.targetRoles?.slice(0, 2).join(', ')}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" /> Upload Resume
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { startOnboarding(); window.location.href = '/'; }}>
            <Pencil className="h-4 w-4" /> Edit Profile
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-primary hover:bg-primary/90"
            onClick={() => { setShowGenPanel(v => !v); }}
            disabled={!profile}
          >
            <Plus className="h-4 w-4" /> New Resume
          </Button>
        </div>
      </div>

      {/* ── Generate panel ── */}
      {showGenPanel && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
          <h2 className="font-semibold text-sm">Generate a New Resume</h2>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Name */}
            <div className="space-y-1 flex-1 min-w-[180px]">
              <label htmlFor="gen-name" className="text-xs text-muted-foreground">Resume name</label>
              <input
                id="gen-name"
                type="text"
                value={genName}
                onChange={e => setGenName(e.target.value)}
                placeholder="e.g. Google SWE 2025"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={e => e.key === 'Enter' && !isGenerating && void handleGenerate()}
              />
            </div>
            {/* Template selector */}
            <div className="space-y-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground">Template</label>
              <select
                value={genTemplateId}
                onChange={e => setGenTemplateId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {RESUME_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => void handleGenerate()}
              disabled={isGenerating || !genName.trim()}
              className="gap-2 h-9"
            >
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><RefreshCw className="h-4 w-4" /> Generate</>}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowGenPanel(false)}>Cancel</Button>
          </div>
          {/* Template thumbnails */}
          <div className="flex gap-3 overflow-x-auto pb-1">
            {RESUME_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setGenTemplateId(t.id)}
                className={[
                  'shrink-0 rounded-xl border-2 overflow-hidden transition-all duration-200',
                  genTemplateId === t.id ? 'border-primary shadow-md' : 'border-border/40 hover:border-border',
                ].join(' ')}
              >
                <img src={t.previewUrl} alt={t.label} className="w-20 h-28 object-cover object-top" />
                <div className="px-2 py-1 text-[10px] font-medium text-center">{t.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Resume grid ── */}
      {resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-5 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">No resumes yet</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {profile
                ? 'Click "New Resume" to generate your first one, or upload an existing .pdf / .docx'
                : 'Complete the profile wizard first, then generate your resume here.'}
            </p>
          </div>
          {profile ? (
            <Button onClick={() => setShowGenPanel(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Generate My First Resume
            </Button>
          ) : (
            <Button onClick={() => { startOnboarding(); window.location.href = '/'; }} className="gap-2">
              <Pencil className="h-4 w-4" /> Build My Profile
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {resumes.map(r => (
            <ResumeCard
              key={r.id}
              resume={r}
              onEdit={setEditingResume}
              onPreview={setPreviewResume}
              onDuplicate={setDuplicatingResume}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Overleaf tip ── */}
      {resumes.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-sm text-blue-400">
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span>
            <strong>To compile:</strong> click Preview on any resume, or click "Open in Overleaf" → New Project → Blank → paste LaTeX → Recompile.
          </span>
        </div>
      )}

      {/* ── Upload dialog ── */}
      <Dialog open={uploadOpen} onOpenChange={o => { setUploadOpen(o); if (!o) { setUploadSummary(null); setUploadError(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Upload Resume</DialogTitle></DialogHeader>
          <ResumeDropzone
            onFile={handleUploadFile}
            isLoading={isUploading}
            parsedSummary={uploadSummary}
            error={uploadError}
            onContinue={() => setUploadOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Modals ── */}
      <ResumeEditorModal
        resume={editingResume}
        onClose={() => setEditingResume(null)}
        onSave={handleSaveEdit}
      />

      <PDFPreviewModal
        resume={previewResume}
        onClose={() => setPreviewResume(null)}
        onDelete={handleDelete}
      />

      <DuplicateModal
        sourceResume={duplicatingResume}
        profile={profile}
        onClose={() => setDuplicatingResume(null)}
        onGenerated={handleDuplicateGenerated}
        callForTask={callForTask}
      />
    </div>
  );
}
