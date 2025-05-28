import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';
import { Clipboard, Download, FileEdit, Save, MessageSquare, Eye } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { getUserData } from '@/lib/firebase';
import { displayLatexInNewWindow } from '@/lib/latexRenderer';

interface CoverLetterGeneratorProps {
  generatedPrompt: string;
  generateLatex: boolean;
}

export function CoverLetterGenerator({ 
  generatedPrompt,
  generateLatex
}: CoverLetterGeneratorProps) {  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedCoverLetter, setEditedCoverLetter] = useState<string>('');
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
    
    fetchApiKey();
  }, [currentUser]);

  const generateCoverLetter = async () => {
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
      
      // Prepare the prompt text based on whether LaTeX is selected or not
      const promptText = generateLatex
        ? `${generatedPrompt}\n\nReturn only the complete LaTeX code that can be compiled. Include all necessary LaTeX packages and document structure. Do not include explanations, just return the LaTeX code.`
        : `${generatedPrompt}\n\nReturn a well-formatted professional cover letter. Do not include explanations, just return the cover letter content.`;

      // Generate content using the model
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: promptText
      });
      
      const text = response.text;
      
      if (text) {
        setGeneratedCoverLetter(text);
        toast.success(`Cover letter ${generateLatex ? 'LaTeX' : ''} generated successfully!`);
      } else {
        toast.error('Failed to generate cover letter content');
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
      toast.error('Failed to generate cover letter. Please check your API key in Settings and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedCoverLetter) {
      // Trim ```latex from beginning and ``` from end if present
      let cleanedContent = generatedCoverLetter;
      
      // Remove ```latex or ``` from beginning
      cleanedContent = cleanedContent.replace(/^```(?:latex)?/m, '');
      
      // Remove ``` from end
      cleanedContent = cleanedContent.replace(/```$/m, '');
      
      // Trim any extra whitespace
      cleanedContent = cleanedContent.trim();
      
      navigator.clipboard.writeText(cleanedContent)
        .then(() => toast.success('Cover letter content copied to clipboard!'))
        .catch((err) => {
          console.error('Failed to copy: ', err);
          toast.error('Failed to copy cover letter content to clipboard');
        });
    }
  };

  const openEditDialog = () => {
    if (generatedCoverLetter) {
      // Clean the content before editing
      let cleanedContent = generatedCoverLetter;
      cleanedContent = cleanedContent.replace(/^```(?:latex)?/m, '');
      cleanedContent = cleanedContent.replace(/```$/m, '');
      cleanedContent = cleanedContent.trim();
      
      setEditedCoverLetter(cleanedContent);
      setIsDialogOpen(true);
    }
  };

  const saveEditedContent = () => {
    setGeneratedCoverLetter(editedCoverLetter);
    setIsDialogOpen(false);
    toast.success('Cover letter content updated successfully!');
  };

  const downloadAsFile = () => {
    if (generatedCoverLetter) {
      // Clean the content before download
      let cleanedContent = generatedCoverLetter;
      cleanedContent = cleanedContent.replace(/^```(?:latex)?/m, '');
      cleanedContent = cleanedContent.replace(/```$/m, '');
      cleanedContent = cleanedContent.trim();
      
      // Create a blob with the content
      const blob = new Blob([cleanedContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary anchor element
      const a = document.createElement('a');
      a.href = url;
      a.download = generateLatex ? 'cover-letter.tex' : 'cover-letter.txt';
      
      // Trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Cover letter ${generateLatex ? 'LaTeX ' : ''}file downloaded successfully!`);
    }
  };

  const previewCoverLetter = () => {
    if (generatedCoverLetter && generateLatex) {
      // Clean the content before preview (only for LaTeX)
      let cleanedContent = generatedCoverLetter;
      cleanedContent = cleanedContent.replace(/^```(?:latex)?/m, '');
      cleanedContent = cleanedContent.replace(/```$/m, '');
      cleanedContent = cleanedContent.trim();
      
      // Display LaTeX in a new window
      displayLatexInNewWindow(cleanedContent, 'Cover Letter Preview');
      toast.success('Opening LaTeX preview in new window');
    }
  };

  return (
    <>
      <Card className="w-full mt-6 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cover Letter Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <Button 
              onClick={generateCoverLetter} 
              disabled={isGenerating || !generatedPrompt || !apiKey}
              className="h-8 text-sm"
              size="sm"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating Cover Letter...' : 'Ask AI to Generate Cover Letter'}
            </Button>
            
            <div className="flex gap-2">
              {generatedCoverLetter && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={copyToClipboard} 
                    className="h-8 text-sm"
                    size="sm"
                  >
                    <Clipboard className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={openEditDialog} 
                    className="h-8 text-sm"
                    size="sm"
                  >
                    <FileEdit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={downloadAsFile} 
                    className="h-8 text-sm"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download {generateLatex ? '.tex' : '.txt'}
                  </Button>                  {generateLatex && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (generatedCoverLetter) {
                          // Clean the content before preview
                          let cleanedContent = generatedCoverLetter;
                          cleanedContent = cleanedContent.replace(/^```(?:latex)?/m, '');
                          cleanedContent = cleanedContent.replace(/```$/m, '');
                          cleanedContent = cleanedContent.trim();
                          
                          // Display LaTeX in a new window
                          displayLatexInNewWindow(cleanedContent, 'Cover Letter Preview');
                          toast.success('Opening LaTeX preview in new window');
                        }
                      }}
                      className="h-8 text-sm"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View HTML
                    </Button>
                  )}
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
          
          {generatedCoverLetter && (
            <div className="mt-4 border rounded-md p-3">
              <h3 className="text-sm font-medium mb-2">Generated Cover Letter:</h3>
              <div className="h-48 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">{generatedCoverLetter}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Cover Letter</DialogTitle>
          </DialogHeader>
          
          <div className="h-96 overflow-y-auto border rounded-md mt-4">
            <Textarea
              value={editedCoverLetter}
              onChange={(e) => setEditedCoverLetter(e.target.value)}
              className="h-full resize-none font-mono text-xs leading-relaxed"
            />
          </div>
          
          <DialogFooter className="sticky bottom-0 pt-4 bg-background">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>            <Button onClick={saveEditedContent}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={downloadAsFile}>
              <Download className="h-4 w-4 mr-2" />
              Download {generateLatex ? '.tex' : '.txt'}
            </Button>
            {generateLatex && (
              <Button variant="outline" onClick={() => {
                // Display LaTeX in a new window
                displayLatexInNewWindow(editedCoverLetter, 'Cover Letter Preview');
                toast.success('Opening LaTeX preview in new window');
              }}>
                <Eye className="h-4 w-4 mr-2" />
                Preview HTML
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
