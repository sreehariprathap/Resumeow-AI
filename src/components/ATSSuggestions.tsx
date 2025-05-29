/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';
import { TrendingUp, RefreshCw, CheckSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { getUserData } from '@/lib/firebase';

interface ATSSuggestion {
  id: string;
  category: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  selected: boolean;
}

interface ATSSuggestionsProps {
  jobDescription: string;
  resumeContent: string;
  onSuggestionsChange: (suggestions: string[]) => void;
  disabled?: boolean;
}

export function ATSSuggestions({ 
  jobDescription, 
  resumeContent, 
  onSuggestionsChange,
  disabled = false
}: ATSSuggestionsProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<ATSSuggestion[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const { currentUser } = useAuth();

  // Get API key from environment or Firebase
  useEffect(() => {
    const fetchApiKey = async () => {
      const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (envApiKey) {
        setApiKey(envApiKey);
        return;
      }
      
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

  // Auto-analyze when job description and resume content are available
  useEffect(() => {
    if (jobDescription && resumeContent && apiKey && !disabled) {
      analyzeSuggestions();
    }
  }, [jobDescription, resumeContent, apiKey, disabled]);

  const analyzeSuggestions = async (): Promise<void> => {
    if (!apiKey) {
      toast.error('Google API key is required. Please add it in Settings.');
      return;
    }

    if (!jobDescription || !resumeContent) {
      toast.error('Job description and resume content are required');
      return;
    }

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
Analyze this resume against the job description and provide specific, actionable suggestions to improve ATS (Applicant Tracking System) compatibility and match.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeContent}

Please analyze and return a JSON response with the following structure:
{
  "suggestions": [
    {
      "id": "<unique_id>",
      "category": "<category_name>",
      "suggestion": "<specific actionable suggestion>",
      "impact": "<high|medium|low>"
    }
  ]
}

Categories should include:
- Keywords & Terminology
- Skills & Technologies  
- Experience Descriptions
- Formatting & Structure
- Industry Standards
- Qualifications & Certifications

Focus on:
1. Missing keywords from job description
2. Skills that should be emphasized or added
3. Experience descriptions that could be improved
4. Format improvements for ATS scanning
5. Industry-specific terminology alignment
6. Qualification gaps that could be addressed

Provide 5-10 actionable suggestions. Each suggestion should be specific and implementable. Return only valid JSON.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });
      
      const text = response.text;
      
      if (!text) {
        throw new Error('No response text received');
      }
      
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        const suggestionsWithSelection = result.suggestions.map((suggestion: any, index: number) => ({
          ...suggestion,
          id: suggestion.id || `suggestion-${index}`,
          selected: true // All suggestions are selected by default
        }));
        setSuggestions(suggestionsWithSelection);
        updateSelectedSuggestions(suggestionsWithSelection);
        toast.success('ATS suggestions generated successfully!');
      } else {
        throw new Error('Invalid JSON response');
      }
    } catch (error) {
      console.error('Error analyzing resume for suggestions:', error);
      toast.error('Failed to generate suggestions. Please check your API key and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateSelectedSuggestions = (currentSuggestions: ATSSuggestion[]) => {
    const selectedSuggestions = currentSuggestions
      .filter(s => s.selected)
      .map(s => `${s.category}: ${s.suggestion}`);
    onSuggestionsChange(selectedSuggestions);
  };

  const toggleSuggestion = (suggestionId: string) => {
    const updatedSuggestions = suggestions.map(s => 
      s.id === suggestionId ? { ...s, selected: !s.selected } : s
    );
    setSuggestions(updatedSuggestions);
    updateSelectedSuggestions(updatedSuggestions);
  };

  const toggleAllSuggestions = (selectAll: boolean) => {
    const updatedSuggestions = suggestions.map(s => ({ ...s, selected: selectAll }));
    setSuggestions(updatedSuggestions);
    updateSelectedSuggestions(updatedSuggestions);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const selectedCount = suggestions.filter(s => s.selected).length;

  if (!jobDescription || !resumeContent) {
    return null;
  }

  return (
    <Card className="w-full mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          ATS Improvement Suggestions
          {suggestions.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {selectedCount}/{suggestions.length} selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!apiKey && (
          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Google API key is required for ATS analysis. Please add it in Settings.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={analyzeSuggestions} 
            disabled={isAnalyzing || !apiKey || !jobDescription || !resumeContent || disabled}
            size="sm"
            variant="outline"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                {suggestions.length > 0 ? 'Re-analyze' : 'Analyze & Get Suggestions'}
              </>
            )}
          </Button>
          
          {suggestions.length > 0 && (
            <>
              <Button 
                onClick={() => toggleAllSuggestions(true)} 
                size="sm"
                variant="outline"
                disabled={disabled}
              >
                Select All
              </Button>
              <Button 
                onClick={() => toggleAllSuggestions(false)} 
                size="sm"
                variant="outline"
                disabled={disabled}
              >
                Deselect All
              </Button>
            </>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Selected suggestions will be automatically included in your prompt instructions.
            </div>
            
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <div 
                  key={suggestion.id} 
                  className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                    suggestion.selected ? 'bg-accent/20 border-accent' : 'bg-background'
                  }`}
                >
                  <Checkbox
                    id={suggestion.id}
                    checked={suggestion.selected}
                    onCheckedChange={() => toggleSuggestion(suggestion.id)}
                    disabled={disabled}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {suggestion.category}
                      </span>
                      <Badge 
                        variant={getImpactColor(suggestion.impact)} 
                        className="text-xs"
                      >
                        {suggestion.impact} impact
                      </Badge>
                    </div>
                    <p className="text-sm">{suggestion.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedCount > 0 && (
          <div className="p-3 bg-accent/10 rounded-lg">
            <p className="text-xs text-muted-foreground">
              {selectedCount} suggestion{selectedCount !== 1 ? 's' : ''} will be included in your resume optimization prompt.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
