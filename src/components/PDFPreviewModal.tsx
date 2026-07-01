import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { SavedResume } from '@/lib/firebaseWeb';

interface PDFPreviewModalProps {
  resume: SavedResume | null;
  onClose: () => void;
}

/** Encode LaTeX to a URL-safe base64 blob for the latexonline.cc renderer */
function makeLatexOnlineUrl(latex: string): string {
  // latexonline.cc/compile?text=<urlencoded-latex>
  return `https://latexonline.cc/compile?text=${encodeURIComponent(latex)}`;
}

export function PDFPreviewModal({ resume, onClose }: PDFPreviewModalProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [key, setKey] = useState(0); // increment to force iframe reload

  const previewUrl = resume ? makeLatexOnlineUrl(resume.latex) : '';

  const handleCopyLatex = () => {
    if (!resume) return;
    navigator.clipboard.writeText(resume.latex)
      .then(() => toast.success('LaTeX copied to clipboard'))
      .catch(() => toast.error('Copy failed'));
  };

  const handleOpenOverleaf = () => {
    if (!resume) return;
    // Open Overleaf with the LaTeX pasted via snip — easiest cross-browser approach
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

  return (
    <Dialog open={!!resume} onOpenChange={o => { if (!o) { setIframeLoaded(false); onClose(); } }}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Preview — {resume?.name}</span>
            <div className="flex gap-2 mr-6">
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={handleCopyLatex}>
                <Copy className="h-3 w-3" /> Copy LaTeX
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5"
                onClick={() => { setIframeLoaded(false); setKey(k => k + 1); }}>
                <RefreshCw className="h-3 w-3" /> Reload
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleOpenOverleaf}>
                <ExternalLink className="h-3 w-3" /> Open in Overleaf
              </Button>
            </div>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Rendered via latexonline.cc — may take 10–20 seconds to compile. For best results, use Overleaf.
          </p>
        </DialogHeader>

        <div className="flex-1 relative min-h-0" style={{ height: 'calc(95vh - 120px)' }}>
          {/* Loading state */}
          {!iframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Compiling LaTeX…</p>
              <p className="text-xs text-muted-foreground/60">This usually takes 10–20 seconds</p>
            </div>
          )}
          <iframe
            key={key}
            src={previewUrl}
            title="PDF Preview"
            className="w-full h-full border-0 rounded-b-lg"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
