import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Clipboard, Download, FileEdit, Save, FileCode, RefreshCw, AlertCircle, FileDown } from 'lucide-react';
import { useAIService } from '@/hooks/useAIService';
import { cleanLatexResponse } from '@/lib/latexUtils';
import { compileLatexToPdf, downloadPdf, LatexCompileError, PDF_COMPILE_TOKEN_COST, getResumePdfFilename } from '@/lib/latexCompiler';
import { PdfPreviewDialog } from './PdfPreviewDialog';
import { useTokens } from '@/lib/tokenContext';
import { useAuth } from '@/lib/authContext';
import { getUserData } from '@/lib/firebaseWeb';
import type { ResumeProfile } from '@/types/resumeProfile';

interface ResumeLaTeXGeneratorProps {
  generatedPrompt: string;
  autoGenerate?: boolean;
  onLatexGenerated?: (latex: string) => void;
  onGeneratingChange?: (generating: boolean) => void;
}

export function ResumeLaTeXGenerator({
  generatedPrompt,
  autoGenerate = false,
  onLatexGenerated,
  onGeneratingChange
}: ResumeLaTeXGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLatex, setGeneratedLatex] = useState<string | null>(null);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedLatex, setEditedLatex] = useState<string>('');
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [resumeProfile, setResumeProfile] = useState<Partial<ResumeProfile>>({});
  const { generateResumeLatex, hasAvailableProviders } = useAIService();
  const { deductTokens, isAdmin } = useTokens();
  const { currentUser } = useAuth();

  // Load profile for filename generation
  useEffect(() => {
    if (!currentUser) return;
    void getUserData(currentUser.uid, 'resumeProfile').then(data => {
      if (data) setResumeProfile(data as ResumeProfile);
    });
  }, [currentUser]);

  // Mirror generation state to the parent (covers both success and failure,
  // since `isGenerating` is always cleared in the `finally` of generateLatex).
  useEffect(() => {
    onGeneratingChange?.(isGenerating);
  }, [isGenerating, onGeneratingChange]);

  // When the prompt changes, drop the stale result so a fresh prompt can
  // (auto-)generate again instead of being blocked by the previous output.
  useEffect(() => {
    setGeneratedLatex(null);
    setGenerationFailed(false);
  }, [generatedPrompt]);
  const generateLatex = useCallback(async () => {
    if (!hasAvailableProviders()) {
      return; // Error toast is handled by the AI service
    }

    if (!generatedPrompt) {
      toast.error('Prompt content is required');
      return;
    }

    setIsGenerating(true);
    
    try {
      const latex = await generateResumeLatex(generatedPrompt);
      setGeneratedLatex(latex);
      setGenerationFailed(false);
      onLatexGenerated?.(latex);
    } catch (error) {
      console.error('Error generating LaTeX:', error);
      setGenerationFailed(true);
    } finally {
      setIsGenerating(false);
    }
  }, [generateResumeLatex, hasAvailableProviders, generatedPrompt, onLatexGenerated]);
  // Auto-generate when autoGenerate is true and we have all requirements
  useEffect(() => {
    if (autoGenerate && hasAvailableProviders() && generatedPrompt && !isGenerating && !generatedLatex) {
      generateLatex();
    }
  }, [autoGenerate, hasAvailableProviders, generatedPrompt, isGenerating, generatedLatex, generateLatex]);

const copyToClipboard = () => {
    if (generatedLatex) {
        const cleanedLatex = cleanLatexResponse(generatedLatex);

        navigator.clipboard.writeText(cleanedLatex)
            .then(() => toast.success('LaTeX code copied to clipboard!'))
            .catch((err) => {
                console.error('Failed to copy: ', err);
                toast.error('Failed to copy LaTeX code to clipboard');
            });
    }
};

const retryGeneration = () => {
  setGenerationFailed(false);
  generateLatex();
};

const openEditDialog = () => {
  if (generatedLatex) {
    setEditedLatex(cleanLatexResponse(generatedLatex));
    setIsDialogOpen(true);
  }
};

const saveEditedLatex = () => {
  setGeneratedLatex(editedLatex);
  setIsDialogOpen(false);
  toast.success('LaTeX code updated successfully!');
};

const downloadAsTex = () => {
  if (generatedLatex) {
    const cleanedLatex = cleanLatexResponse(generatedLatex);
    
    // Create a blob with the LaTeX content
    const blob = new Blob([cleanedLatex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.tex';
    
    // Trigger the download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('LaTeX file downloaded successfully!');
  }
};

const pdfFilename = getResumePdfFilename({
  firstName: resumeProfile.firstName,
  lastName: resumeProfile.lastName,
  position: resumeProfile.targetRoles?.[0],
});

const compileAndPreview = async () => {
  if (!generatedLatex) return;
  const cleaned = cleanLatexResponse(generatedLatex);
  setPdfBlob(null);
  setCompileError(null);
  setIsPdfOpen(true);
  setIsCompiling(true);
  try {
    const blob = await compileLatexToPdf(cleaned);
    setPdfBlob(blob);
    if (!isAdmin) void deductTokens(PDF_COMPILE_TOKEN_COST);
  } catch (err) {
    const log = err instanceof LatexCompileError ? err.log : String(err);
    setCompileError(log);
    toast.error('Compilation failed — see error log in preview.');
  } finally {
    setIsCompiling(false);
  }
};

const handleDownloadPdf = async () => {
  if (pdfBlob) {
    downloadPdf(pdfBlob, pdfFilename);
    toast.success('PDF downloaded!');
    return;
  }
  if (!generatedLatex) return;
  const cleaned = cleanLatexResponse(generatedLatex);
  setIsCompiling(true);
  try {
    const blob = await compileLatexToPdf(cleaned);
    setPdfBlob(blob);
    downloadPdf(blob, pdfFilename);
    if (!isAdmin) void deductTokens(PDF_COMPILE_TOKEN_COST);
    toast.success('PDF downloaded!');
  } catch {
    toast.error('PDF compilation failed. Try "Open in Overleaf" instead.');
  } finally {
    setIsCompiling(false);
  }
};

const openInOverleaf = () => {
  if (!generatedLatex) return;
  const cleanedLatex = cleanLatexResponse(generatedLatex);
  // Set the value and submit the form
  const form = document.getElementById('ol_form') as HTMLFormElement | null;
  const input = document.getElementById('ol_encoded_snip') as HTMLInputElement | null;
  if (form && input) {
    input.value = encodeURIComponent(cleanedLatex);
    form.submit();
  }
};

  return (
    <>
      <Card className="w-full mt-6 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">LaTeX Resume Generator</CardTitle>
        </CardHeader>        <CardContent className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">            <Button 
              onClick={generateLatex} 
              disabled={isGenerating || !generatedPrompt || !hasAvailableProviders()}
              className="h-8 text-sm"
              size="sm"
            >
              <FileCode className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating LaTeX...' : 'Ask AI to Generate LaTeX Resume'}
            </Button>
            
            <div className="flex gap-2">
              {generatedLatex && (
                <>
                    <Button 
                    variant="outline" 
                    onClick={copyToClipboard} 
                    className="h-8 text-sm"
                    size="sm"
                    >
                    <Clipboard className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Copy</span>
                    </Button>
                    <Button 
                    variant="outline" 
                    onClick={openEditDialog} 
                    className="h-8 text-sm"
                    size="sm"
                    >
                    <FileEdit className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Edit</span>
                    </Button>
                    <Button 
                    variant="outline" 
                    onClick={downloadAsTex} 
                    className="h-8 text-sm"
                    size="sm"
                    >
                    <Download className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Download .tex</span>
                    </Button>
                    <Button
                    variant="outline"
                    onClick={compileAndPreview}
                    disabled={isCompiling}
                    className="h-8 text-sm"
                    size="sm"
                    >
                    {isCompiling
                      ? <><RefreshCw className="h-4 w-4 md:mr-2 animate-spin" /><span className="hidden md:inline">Compiling…</span></>
                      : <><FileDown className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Preview PDF</span></>
                    }
                    </Button>
                    <Button
                    variant="outline"
                    onClick={handleDownloadPdf}
                    disabled={isCompiling}
                    className="h-8 text-sm"
                    size="sm"
                    >
                    <FileDown className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Download PDF</span>
                    </Button>
                    <Button
                    variant="outline"
                    onClick={() => openInOverleaf()}
                    className="h-8 text-sm"
                    size="sm"
                    >
                    <FileCode className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Open in Overleaf</span>
                    </Button>
                </>
              )}            </div>
          </div>
            {!hasAvailableProviders() && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                AI API key is required. Please add it in the Settings dialog.
              </p>
            </div>
          )}

          {generationFailed && !isGenerating && (
            <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-xs text-destructive font-medium">
                  LaTeX generation failed
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Please check your API key and try again.
              </p>
              <Button
                onClick={retryGeneration}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={isGenerating}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry Generation
              </Button>
            </div>
          )}
          
          {generatedLatex && (
            <div className="mt-4 border rounded-md p-3">
              <h3 className="text-sm font-medium mb-2">Generated LaTeX Resume:</h3>
              <div className="h-48 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">{generatedLatex}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit LaTeX Resume</DialogTitle>
          </DialogHeader>
          
          <div className="h-96 overflow-y-auto border rounded-md mt-4">
            <Textarea
              value={editedLatex}
              onChange={(e) => setEditedLatex(e.target.value)}
              className="h-full resize-none font-mono text-xs leading-relaxed"
            />
          </div>
          
          <DialogFooter className="sticky bottom-0 pt-4 bg-background gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEditedLatex}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={downloadAsTex}>
              <Download className="h-4 w-4 mr-2" />
              Download .tex
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form id="ol_form" action="https://www.overleaf.com/docs" method="post" target="_blank" style={{ display: 'none' }}>
        <input id="ol_encoded_snip" type="hidden" name="encoded_snip" />
      </form>

      <PdfPreviewDialog
        open={isPdfOpen}
        onOpenChange={setIsPdfOpen}
        pdfBlob={pdfBlob}
        isCompiling={isCompiling}
        compileError={compileError}
        onDownload={handleDownloadPdf}
      />
    </>
  );
}

