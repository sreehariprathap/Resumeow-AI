import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';
import { Clipboard, Key } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ResumeLaTeXGeneratorProps {
  jobDescription: string;
  resumeContent: string;
  optionalInstructions?: string;
}

export function ResumeLaTeXGenerator({ 
  generatedPrompt
}: ResumeLaTeXGeneratorProps) {  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLatex, setGeneratedLatex] = useState<string | null>(null);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  // Use the API key from environment variable
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;


 

  const generateLatex = async () => {
    if (!apiKey) {
      setIsEditingApiKey(true);
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
      }
    } catch (error) {
      console.error('Error generating LaTeX:', error);
      toast.error('Failed to generate LaTeX resume. Please check your API key and try again.');
      setIsEditingApiKey(true);
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

  return (
    <Card className="w-full mt-6 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">LaTeX Resume Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditingApiKey ? (
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-xs">Google Gemini API Key</Label>
            <div className="flex gap-2">
              <Input 
                id="api-key"
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="h-8 text-sm flex-1"
              />
              <Button 
                onClick={saveApiKey} 
                size="sm"
                className="h-8"
              >
                Save Key
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline">Google AI Studio</a>
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-between items-center gap-2">
            <Button 
              onClick={generateLatex} 
              disabled={isGenerating || !generatedPrompt }
              className="h-8 text-sm"
              size="sm"
            >
              {isGenerating ? 'Generating LaTeX...' : 'Generate LaTeX Resume'}
            </Button>
            
            <div className="flex gap-2">
              {apiKey && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setIsEditingApiKey(true)}
                >
                  <Key className="h-3 w-3 mr-1" />
                  Change API Key
                </Button>
              )}
              
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
            </div>
          </div>
        )}
        
        {generatedLatex && !isEditingApiKey && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              LaTeX code has been generated! Click the button above to copy it to your clipboard.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
// Add a function to save the API key
function saveApiKey() {
  // Implement your API key saving logic here
  setIsEditingApiKey(false);
}
}

