import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Copy, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  compileLatexToPdf, downloadPdf, getResumePdfFilename, LatexCompileError,
} from '@/lib/latexCompiler';
import type { SavedResume } from '@/lib/firebaseWeb';

interface PDFPreviewModalProps {
  resume: SavedResume | null;
  onClose: () => void;
  onDelete?: (r: SavedResume) => void;
}

export function PDFPreviewModal({ resume, onClose, onDelete }: PDFPreviewModalProps) {
  const [objectUrl,    setObjectUrl]    = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isCompiling,  setIsCompiling]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Compile whenever the resume changes
  useEffect(() => {
    if (!resume) {
      setObjectUrl(null);
      setCompileError(null);
      return;
    }

    let cancelled = false;
    setObjectUrl(null);
    setCompileError(null);
    setIsCompiling(true);

    compileLatexToPdf(resume.latex)
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(err => {
        if (cancelled) return;
        const msg = err instanceof LatexCompileError ? err.log : (err instanceof Error ? err.message : String(err));
        setCompileError(msg);
      })
      .finally(() => {
        if (!cancelled) setIsCompiling(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resume]);

  // Revoke object URL on unmount / change
  useEffect(() => {
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [objectUrl]);

  const handleRecompile = () => {
    if (!resume) return;
    // Trigger re-run by clearing and re-setting — the effect watches `resume`
    // so we force re-trigger by toggling a local key via a no-op setState.
    // Instead: just call the effect manually by clearing error and blob.
    setObjectUrl(null);
    setCompileError(null);
    setIsCompiling(true);

    compileLatexToPdf(resume.latex)
      .then(blob => {
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(err => {
        const msg = err instanceof LatexCompileError ? err.log : (err instanceof Error ? err.message : String(err));
        setCompileError(msg);
      })
      .finally(() => setIsCompiling(false));
  };

  const handleDownload = () => {
    if (!objectUrl || !resume) return;
    fetch(objectUrl)
      .then(r => r.blob())
      .then(blob => {
        downloadPdf(blob, getResumePdfFilename({ firstName: resume.name }));
      })
      .catch(() => toast.error('Download failed'));
  };

  const handleCopyLatex = () => {
    if (!resume) return;
    navigator.clipboard.writeText(resume.latex)
      .then(() => toast.success('LaTeX copied to clipboard'))
      .catch(() => toast.error('Copy failed'));
  };

  const handleOpenOverleaf = () => {
    if (!resume) return;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.overleaf.com/docs';
    form.target = '_blank';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'snip';
    input.value = resume.latex;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const handleClose = () => {
    setObjectUrl(null);
    setCompileError(null);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <Dialog open={!!resume} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="w-screen h-screen max-w-full m-0 rounded-none flex flex-col gap-0 p-0 border-0 bg-background">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50 shrink-0">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
            <span className="text-sm sm:text-lg truncate min-w-0">Preview — {resume?.name}</span>
            <div className="flex gap-2 flex-wrap">
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-7 text-xs gap-1.5 ${confirmDelete ? 'text-destructive hover:text-destructive' : 'text-muted-foreground'}`}
                  onClick={() => {
                    if (confirmDelete && resume) {
                      onDelete(resume);
                      handleClose();
                    } else {
                      setConfirmDelete(true);
                      setTimeout(() => setConfirmDelete(false), 3000);
                    }
                  }}
                >
                  <AlertCircle className="h-3 w-3" />
                  {confirmDelete ? 'Confirm delete' : 'Delete'}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={handleCopyLatex}>
                <Copy className="h-3 w-3" /> Copy LaTeX
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5"
                onClick={handleRecompile} disabled={isCompiling}>
                <RefreshCw className={`h-3 w-3 ${isCompiling ? 'animate-spin' : ''}`} /> Recompile
              </Button>
              {objectUrl && (
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={handleDownload}>
                  <Download className="h-3 w-3" /> Download PDF
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleOpenOverleaf}>
                <ExternalLink className="h-3 w-3" /> Open in Overleaf
              </Button>
            </div>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Compiled via latex.ytotech.com (pdflatex) — usually takes ~5 seconds.
          </p>
        </DialogHeader>

        <div className="flex-1 relative min-h-0 p-4" style={{ height: 'calc(100vh - 120px)' }}>
          {/* Compiling state */}
          {isCompiling && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Compiling LaTeX…</p>
              <p className="text-xs text-muted-foreground/60">Usually takes ~5 seconds</p>
            </div>
          )}

          {/* Compiler error */}
          {compileError && !isCompiling && (
            <div className="h-full overflow-auto p-4 bg-destructive/10 border border-destructive/20 rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm font-medium text-destructive">Compilation failed</p>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">
                {compileError}
              </pre>
              <Button size="sm" variant="outline" onClick={handleRecompile} className="mt-2">
                <RefreshCw className="h-3 w-3 mr-1.5" /> Retry
              </Button>
            </div>
          )}

          {/* PDF iframe */}
          {objectUrl && !isCompiling && (
            <iframe
              src={objectUrl}
              title="Resume PDF Preview"
              className="w-full h-full rounded-md border border-border"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
