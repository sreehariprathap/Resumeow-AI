import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';
import { Clipboard, Download, FileEdit, Save, FileCode } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { getUserData } from '@/lib/firebase';

interface ResumeLaTeXGeneratorProps {
  generatedPrompt: string;
  autoGenerate?: boolean;
}

export function ResumeLaTeXGenerator({ 
  generatedPrompt,
  autoGenerate = false
}: ResumeLaTeXGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLatex, setGeneratedLatex] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedLatex, setEditedLatex] = useState<string>('');
  const { currentUser } = useAuth();

  // Try to get API key from environment or Firebase
  useEffect(() => {
    const fetchApiKey = async () => {
      // First check environment variable
      const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (envApiKey) {
        setApiKey(envApiKey);
        return;
      }
      
      // If no env API key and user is logged in, check Firebase
      if (currentUser) {
        try {
          const userData = await getUserData(currentUser.uid, "settings");
          if (userData && userData.googleApiKey) {
            setApiKey(userData.googleApiKey as string);
          }
        } catch (error) {
          console.error("Error loading API key from user settings:", error);
        }
      }
    };
    
    fetchApiKey();  }, [currentUser]);

  const generateLatex = useCallback(async () => {
    if (!apiKey) {
      toast.error('Google API key is required. Please add it in the Settings.');
      return;
    }

    if (!generatedPrompt) {
      toast.error('Prompt content is required');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Initialize the Gemini API client
      const ai = new GoogleGenAI({ apiKey });
      
      // Prepare the prompt text
      const promptText = `
    ${generatedPrompt}

        Return only the complete LaTeX code that can be compiled. Include all necessary LaTeX packages and document structure.
        Do not include explanations, just return the LaTeX code.
      `;

      // Generate content using the model
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: promptText
      });
      
      const text = response.text;
      
      if (text) {
        setGeneratedLatex(text);
        toast.success('LaTeX resume generated successfully!');
      } else {
        toast.error('Failed to generate LaTeX content');
      }    } catch (error) {
      console.error('Error generating LaTeX:', error);
      toast.error('Failed to generate LaTeX resume. Please check your API key in Settings and try again.');
    } finally {
      setIsGenerating(false);    }
  }, [apiKey, generatedPrompt]);

  // Auto-generate when autoGenerate is true and we have all requirements
  useEffect(() => {
    if (autoGenerate && apiKey && generatedPrompt && !isGenerating && !generatedLatex) {
      generateLatex();
    }
  }, [autoGenerate, apiKey, generatedPrompt, isGenerating, generatedLatex, generateLatex]);

const copyToClipboard = () => {
    if (generatedLatex) {
        // Trim ```latex from beginning and ``` from end if present
        let cleanedLatex = generatedLatex;
        
        // Remove ```latex or ``` from beginning
        cleanedLatex = cleanedLatex.replace(/^```(?:latex)?/m, '');
        
        // Remove ``` from end
        cleanedLatex = cleanedLatex.replace(/```$/m, '');
        
        // Trim any extra whitespace
        cleanedLatex = cleanedLatex.trim();
        
        navigator.clipboard.writeText(cleanedLatex)
            .then(() => toast.success('LaTeX code copied to clipboard!'))
            .catch((err) => {
                console.error('Failed to copy: ', err);
                toast.error('Failed to copy LaTeX code to clipboard');
            });
    }
};

const openEditDialog = () => {
  if (generatedLatex) {
    // Clean the LaTeX before editing
    let cleanedLatex = generatedLatex;
    cleanedLatex = cleanedLatex.replace(/^```(?:latex)?/m, '');
    cleanedLatex = cleanedLatex.replace(/```$/m, '');
    cleanedLatex = cleanedLatex.trim();
    
    setEditedLatex(cleanedLatex);
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
    // Clean the LaTeX before download
    let cleanedLatex = generatedLatex;
    cleanedLatex = cleanedLatex.replace(/^```(?:latex)?/m, '');
    cleanedLatex = cleanedLatex.replace(/```$/m, '');
    cleanedLatex = cleanedLatex.trim();
    
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

const openInOverleaf = () => {
  if (!generatedLatex) return;
  let cleanedLatex = generatedLatex.replace(/^```(?:latex)?/m, '');
  cleanedLatex = cleanedLatex.replace(/```$/m, '');
  cleanedLatex = cleanedLatex.trim();
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
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <Button 
              onClick={generateLatex} 
              disabled={isGenerating || !generatedPrompt || !apiKey}
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
                    onClick={() => openInOverleaf()}
                    className="h-8 text-sm"
                    size="sm"
                    >
                    <FileCode className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Open in Overleaf</span>
                    </Button>
                </>
              )}
            </div>
          </div>
          
          {!apiKey && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Google API key is required. Please add it in the Settings dialog.
              </p>
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
    </>
  );
}

