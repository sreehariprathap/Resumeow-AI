import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Save, Download, Loader2, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { compileLatexToPdf, LatexCompileError } from '@/lib/latexCompiler';
import { useAIService } from '@/hooks/useAIService';
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

  const { callForTask } = useAIService();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (resume) {
      setName(resume.name);
      setLatex(resume.latex);
    } else {
      setObjectUrl(null);
      setCompileError(null);
      setChatInput('');
    }
  }, [resume]);

  // Compile PDF whenever latex changes (debounced by 1s)
  useEffect(() => {
    if (!latex) {
      setObjectUrl(null);
      return;
    }
    const timer = setTimeout(() => {
      setIsCompiling(true);
      compileLatexToPdf(latex)
        .then(blob => {
          setObjectUrl(URL.createObjectURL(blob));
          setCompileError(null);
        })
        .catch(err => {
          setCompileError(err instanceof LatexCompileError ? err.log : String(err));
        })
        .finally(() => setIsCompiling(false));
    }, 1000);
    return () => clearTimeout(timer);
  }, [latex]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;
    
    setIsGenerating(true);
    const instruction = chatInput.trim();
    setChatInput('');
    
    try {
      const prompt = `Here is the current LaTeX resume:\n\n${latex}\n\nThe user requested the following change: "${instruction}".\nReturn ONLY the fully updated valid LaTeX document incorporating this change. Do not include markdown formatting or explanations.`;
      
      const updatedLatex = await callForTask('resumeLatex', prompt);
      setLatex(updatedLatex);
      toast.success('Resume updated based on your feedback');
    } catch (err) {
      toast.error('Failed to update resume');
    } finally {
      setIsGenerating(false);
    }
  };

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
    <Dialog open={!!resume} onOpenChange={o => { if (!o && !saving && !isGenerating) onClose(); }}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/50 shrink-0">
          <DialogTitle>Edit Resume</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Editor & Chat */}
          <div className="w-1/2 flex flex-col border-r border-border/50 p-6 space-y-4 overflow-hidden">
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
          <div className="flex-1 flex flex-col space-y-1.5 min-h-0 relative">
            <Label htmlFor="chat-input">Ask AI to change something</Label>
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <Input 
                id="chat-input"
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                placeholder="e.g., Shorten the professional summary"
                disabled={isGenerating}
              />
              <Button type="submit" disabled={isGenerating || !chatInput.trim()}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-between">
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
                'min-h-[200px]',
              ].join(' ')}
            />
          </div>
          </div>
          
          {/* Right Pane: Live PDF */}
          <div className="w-1/2 relative bg-muted/10 p-4 flex flex-col">
            {isCompiling && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Compiling...</p>
              </div>
            )}
            {compileError && !isCompiling && (
              <div className="h-full overflow-auto p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-sm font-medium text-destructive">Compilation failed</p>
                </div>
                <pre className="text-xs text-destructive font-mono whitespace-pre-wrap">{compileError}</pre>
              </div>
            )}
            {objectUrl && !isCompiling && (
              <iframe src={objectUrl} className="w-full h-full rounded-md border bg-white" title="Live Preview" />
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50 gap-2 shrink-0">
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
