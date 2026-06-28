import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Download, Loader2, AlertCircle } from 'lucide-react';

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob | null;
  isCompiling: boolean;
  compileError: string | null;
  onDownload: () => void;
}

export const PdfPreviewDialog = ({
  open,
  onOpenChange,
  pdfBlob,
  isCompiling,
  compileError,
  onDownload,
}: PdfPreviewDialogProps) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfBlob) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(pdfBlob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdfBlob]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-base">PDF Preview</DialogTitle>
          {pdfBlob && (
            <Button size="sm" onClick={onDownload} className="gap-2 mr-8">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 p-4">
          {isCompiling && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Compiling LaTeX — this takes ~5 seconds…</p>
            </div>
          )}

          {compileError && !isCompiling && (
            <div className="h-full overflow-auto p-4 bg-destructive/10 border border-destructive/20 rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm font-medium text-destructive">Compilation failed</p>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {compileError}
              </pre>
            </div>
          )}

          {objectUrl && !isCompiling && (
            <iframe
              src={objectUrl}
              className="w-full h-full rounded-md border"
              title="Resume PDF Preview"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
