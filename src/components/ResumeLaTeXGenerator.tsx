import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';
import { Clipboard, Download, Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { getUserData, saveUserData } from '@/lib/firebase';

interface ResumeLaTeXGeneratorProps {
  generatedPrompt: string;
}

export function ResumeLaTeXGenerator({ 
  generatedPrompt
}: ResumeLaTeXGeneratorProps) {  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLatex, setGeneratedLatex] = useState<string | null>(() => {
    // Try to load from localStorage on component mount
    return localStorage.getItem('generatedLatex') || null;
  });
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [syncToCloud, setSyncToCloud] = useState<boolean>(() => {
    return localStorage.getItem('syncLatexToCloud') === 'true';
  });
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

  // Load LaTeX from Firebase if user is logged in and syncToCloud is enabled
  useEffect(() => {
    const loadFromFirebase = async () => {
      if (currentUser && syncToCloud) {
        try {
          const latexData = await getUserData(currentUser.uid, "latexData");
          if (latexData && latexData.generatedLatex) {
            setGeneratedLatex(latexData.generatedLatex as string);
          }
        } catch (error) {
          console.error("Error loading LaTeX from Firebase:", error);
        }
      }
    };
    
    loadFromFirebase();
  }, [currentUser, syncToCloud]);

  // Save generated LaTeX to localStorage when it changes
  useEffect(() => {
    if (generatedLatex) {
      localStorage.setItem('generatedLatex', generatedLatex);
      
      // If user is logged in and cloud sync is enabled, save to Firebase
      if (currentUser && syncToCloud) {
        const saveToFirebase = async () => {
          try {
            await saveUserData(currentUser.uid, "latexData", { 
              generatedLatex,
              updatedAt: new Date().toISOString() 
            });
          } catch (error) {
            console.error("Error saving LaTeX to Firebase:", error);
          }
        };
        
        saveToFirebase();
      }
    }
  }, [generatedLatex, currentUser, syncToCloud]);


 
  const generateLatex = async () => {
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
      setIsGenerating(false);
    }
  };

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

const downloadLatex = () => {
    if (generatedLatex) {
        // Trim ```latex from beginning and ``` from end if present
        let cleanedLatex = generatedLatex;
        
        // Remove ```latex or ``` from beginning
        cleanedLatex = cleanedLatex.replace(/^```(?:latex)?/m, '');
        
        // Remove ``` from end
        cleanedLatex = cleanedLatex.replace(/```$/m, '');
        
        // Trim any extra whitespace
        cleanedLatex = cleanedLatex.trim();
        
        // Create a blob with the LaTeX content
        const blob = new Blob([cleanedLatex], { type: 'text/plain' });
        
        // Create a URL for the blob
        const url = URL.createObjectURL(blob);
        
        // Create a temporary anchor element to trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resume.tex';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        toast.success('LaTeX file downloaded!');
    }
};

const clearSavedLatex = () => {
  setGeneratedLatex(null);
  localStorage.removeItem('generatedLatex');
  
  if (currentUser && syncToCloud) {
    const clearFromFirebase = async () => {
      try {
        // Save an empty object to effectively clear the data
        await saveUserData(currentUser.uid, "latexData", { 
          generatedLatex: null,
          updatedAt: new Date().toISOString() 
        });
        toast.success('Saved LaTeX data cleared from cloud!');
      } catch (error) {
        console.error("Error clearing LaTeX from Firebase:", error);
        toast.error('Failed to clear saved data from cloud.');
      }
    };
    
    clearFromFirebase();
  } else {
    toast.success('Saved LaTeX data cleared!');
  }
};

  return (
    <Card className="w-full mt-6 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">LaTeX Resume Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex gap-2">
            <Button 
              onClick={generateLatex} 
              disabled={isGenerating || !generatedPrompt || !apiKey}
              className="h-8 text-sm"
              size="sm"
            >
              {isGenerating ? 'Generating LaTeX...' : 'Generate LaTeX Resume'}
            </Button>
            
            {generatedLatex && (
              <Button
                variant="destructive"
                onClick={clearSavedLatex}
                className="h-8 text-sm"
                size="sm"
              >
                Clear Saved
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {generatedLatex && (
              <Button 
                variant="outline" 
                onClick={copyToClipboard} 
                className="h-8 text-sm"
                size="sm"
              >
                <Clipboard className="h-4 w-4 mr-2" />
                Copy LaTeX
              </Button>
            )}
            {generatedLatex && (
              <Button 
                variant="outline" 
                onClick={downloadLatex} 
                className="h-8 text-sm"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download .tex
              </Button>
            )}
          </div>
            {currentUser && generatedLatex && (
              <Button
                variant="outline"
                onClick={() => {
                  const newValue = !syncToCloud;
                  setSyncToCloud(newValue);
                  localStorage.setItem('syncLatexToCloud', newValue.toString());
                  toast.success(newValue 
                    ? 'LaTeX syncing to cloud enabled!' 
                    : 'LaTeX syncing to cloud disabled!');
                }}
                className="h-8 text-sm"
                size="sm"
              >
                {syncToCloud ? (
                  <><Cloud className="h-4 w-4 mr-2" />Sync: ON</>
                ) : (
                  <><CloudOff className="h-4 w-4 mr-2" />Sync: OFF</>
                )}
              </Button>
            )}
        </div>
        
        {!apiKey && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              Google API key is required. Please add it in the Settings dialog.
            </p>
          </div>
        )}
          {generatedLatex && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              LaTeX code has been generated! Click the buttons above to copy it to your clipboard or download it as a .tex file. 
              {currentUser && ' Your LaTeX code will be saved locally and can be synced to the cloud for access across devices.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>  );
}

