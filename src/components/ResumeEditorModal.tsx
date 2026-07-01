import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Save, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { SavedResume } from '@/lib/firebaseWeb';

interface ResumeEditorModalProps {
  resume: SavedResume | null;
  onClose: () => void;
  onSave: (resumeId: string, name: string, latex: string) => Promise<void>;
}

export function ResumeEditorModal({ resume, onClose, onSave }: ResumeEditorModalProps) {
  const [name, setName]   = useState('');
  const [latex, setLatex] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (resume) {
      setName(resume.name);
      setLatex(resume.latex);
    }
  }, [resume]);

  const handleSave = async () => {
    if (!resume) return;
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    setSaving(true);
    try {
      await onSave(resume.id, name.trim(), latex);
      toast.success('Resume saved');
      onClose();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(latex)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Copy failed'));
  };

  const handleDownload = () => {
    const blob = new Blob([latex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_') || 'resume'}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!resume} onOpenChange={o => { if (!o && !saving) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/50">
          <DialogTitle>Edit Resume</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-3 flex-1 flex flex-col overflow-hidden">
          {/* Name field */}
          <div className="space-y-1.5 shrink-0">
            <Label htmlFor="resume-editor-name">Resume name</Label>
            <Input
              id="resume-editor-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Google SWE 2025"
              className="max-w-sm"
            />
          </div>

          {/* LaTeX editor */}
          <div className="flex-1 flex flex-col space-y-1.5 min-h-0">
            <div className="flex items-center justify-between">
              <Label htmlFor="resume-latex-editor">LaTeX source</Label>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCopy}>
                  <Copy className="h-3 w-3" /> Copy
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleDownload}>
                  <Download className="h-3 w-3" /> Download .tex
                </Button>
              </div>
            </div>
            <textarea
              id="resume-latex-editor"
              value={latex}
              onChange={e => setLatex(e.target.value)}
              spellCheck={false}
              className={[
                'flex-1 w-full resize-none rounded-md border border-input bg-muted/30',
                'p-3 font-mono text-xs leading-relaxed text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                'min-h-[400px]',
              ].join(' ')}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50 gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
