/**
 * CombinedATSAnalysis Component
 * 
 * This component combines the functionality of InitialATSAnalysis and ATSSuggestions
 * into a single component that makes one API call instead of two separate calls.
 * This optimization significantly reduces LLM token usage while providing the same
 * functionality: ATS scoring, missing keywords detection, and improvement suggestions.
 * 
 * Benefits:
 * - Reduced API calls (2 → 1)
 * - Lower token consumption
 * - Faster analysis
 * - Consistent scoring and suggestions based on the same analysis
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { AlertCircle, BarChart3, RefreshCw, CheckCircle, TrendingUp, CheckSquare } from 'lucide-react';
import { useAIProvider } from '@/lib/aiProviderContext';

interface ATSScore {
  overall: number;
  keywordMatch: number;
  skillsAlignment: number;
  experienceMatch: number;
  formatCompliance: number;
  feedback: string[];
  missingKeywords: string[];
  recommendations: string[];
}

interface RawSuggestion {
  id?: string;
  category: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
}

interface ATSSuggestion {
  id: string;
  category: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  selected: boolean;
}

interface CombinedATSAnalysisProps {
  jobDescription: string;
  resumeContent: string;
  onAnalysisComplete: (score: ATSScore) => void;
  onMissingKeywords: (keywords: string[]) => void;
  onSuggestionsChange: (suggestions: string[]) => void;
  disabled?: boolean;
}

export function CombinedATSAnalysis({ 
  jobDescription, 
  resumeContent, 
  onAnalysisComplete,
  onMissingKeywords,
  onSuggestionsChange,
  disabled = false
}: CombinedATSAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [currentScore, setCurrentScore] = useState<ATSScore | null>(null);
  const [suggestions, setSuggestions] = useState<ATSSuggestion[]>([]);
  const { makeAICall } = useAIProvider();

  const updateSelectedSuggestions = useCallback((currentSuggestions: ATSSuggestion[]) => {
    const selectedSuggestions = currentSuggestions
      .filter(s => s.selected)
      .map(s => `${s.category}: ${s.suggestion}`);
    onSuggestionsChange(selectedSuggestions);
  }, [onSuggestionsChange]);

  // Auto-analyze when all data is available
  useEffect(() => {
    if (jobDescription && resumeContent && !disabled && !analysisComplete) {
      performCombinedAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobDescription, resumeContent, disabled, analysisComplete]);
  const performCombinedAnalysis = async (): Promise<void> => {
    if (!jobDescription || !resumeContent) {
      toast.error('Job description and resume content are required');
      return;
    }

    setIsAnalyzing(true);
    try {
      const prompt = `
Analyze this resume against the job description and provide both ATS (Applicant Tracking System) compatibility scoring AND specific improvement suggestions in a single comprehensive analysis.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeContent}

Please analyze and return a JSON response with the following structure:
{
  "atsScore": {
    "overall": <number 0-100>,
    "keywordMatch": <number 0-100>,
    "skillsAlignment": <number 0-100>,
    "experienceMatch": <number 0-100>,
    "formatCompliance": <number 0-100>,
    "feedback": [<array of specific feedback points>],
    "missingKeywords": [<array of important keywords missing from resume>],
    "recommendations": [<array of actionable recommendations to improve ATS score>]
  },
  "suggestions": [
    {
      "id": "<unique_id>",
      "category": "<category_name>",
      "suggestion": "<specific actionable suggestion>",
      "impact": "<high|medium|low>"
    }
  ]
}

FOR ATS SCORE ANALYSIS:
Consider:
- Keyword density and relevance
- Skills mentioned in job description vs resume
- Experience level and requirements match
- ATS-friendly formatting
- Industry-specific terminology
- Required qualifications coverage

Focus particularly on identifying ALL missing keywords from the job description that should be in the resume.

FOR SUGGESTIONS:
Categories should include:
- Keywords & Terminology
- Skills & Technologies  
- Experience Descriptions
- Formatting & Structure
- Industry Standards
- Qualifications & Certifications

Focus on:
1. Missing keywords from job description
2. Skills that should be emphasized or added (ALWAYS include a suggestion about incorporating key skills naturally)
3. Experience descriptions that could be improved
4. Format improvements for ATS scanning
5. Industry-specific terminology alignment
6. Qualification gaps that could be addressed

IMPORTANT: Always include at least one suggestion about adding key skills from the job description naturally throughout the resume.

Provide 5-10 actionable suggestions. Each suggestion should be specific and implementable. Return only valid JSON.
`;      const response = await makeAICall(prompt);
      
      const text = response;
      
      if (!text) {
        throw new Error('No response text received');
      }
      
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        // Process ATS Score
        const score = result.atsScore;
        setCurrentScore(score);
        setAnalysisComplete(true);
        
        // Notify parent components for ATS score
        onAnalysisComplete(score);
        onMissingKeywords(score.missingKeywords || []);
          // Process Suggestions
        let suggestionsWithSelection = result.suggestions.map((suggestion: RawSuggestion, index: number) => ({
          ...suggestion,
          id: suggestion.id || `suggestion-${index}`,
          selected: true // All suggestions are selected by default
        }));

        // Always ensure there's a suggestion about adding key skills naturally
        const hasKeySkillsSuggestion = suggestionsWithSelection.some((s: ATSSuggestion) => 
          s.suggestion.toLowerCase().includes('key skills') || 
          s.suggestion.toLowerCase().includes('essential skills') ||
          s.suggestion.toLowerCase().includes('incorporate') && s.suggestion.toLowerCase().includes('skills') ||
          (s.category.toLowerCase() === 'skills & technologies' && s.suggestion.toLowerCase().includes('add'))
        );

        if (!hasKeySkillsSuggestion) {
          // Extract some skills from job description for a more specific suggestion
          const skillKeywords = jobDescription.toLowerCase().match(/\b(?:python|javascript|react|node\.js|sql|aws|docker|kubernetes|git|agile|scrum|java|c\+\+|html|css|machine learning|data analysis|project management|leadership|communication|teamwork|problem solving|analytical|technical|programming|development|software|database|cloud|api|framework|library|testing|debugging|optimization)\b/gi) || [];
          const uniqueSkills = [...new Set(skillKeywords)].slice(0, 5);
          
          const skillsText = uniqueSkills.length > 0 
            ? `key skills (such as ${uniqueSkills.join(', ')}) ` 
            : 'key skills ';

          const keySkillsSuggestion: ATSSuggestion = {
            id: 'key-skills-natural',
            category: 'Skills & Technologies',
            suggestion: `Add all ${skillsText}from the job description naturally throughout your resume, particularly in the skills section, experience descriptions, and summary to improve keyword matching and ATS compatibility.`,
            impact: 'high' as const,
            selected: true
          };
          suggestionsWithSelection = [keySkillsSuggestion, ...suggestionsWithSelection];
        }

        setSuggestions(suggestionsWithSelection);
        updateSelectedSuggestions(suggestionsWithSelection);
        
        toast.success(`ATS analysis complete! Score: ${score.overall}% with ${suggestionsWithSelection.length} improvement suggestions`);
        
        if (score.missingKeywords && score.missingKeywords.length > 0) {
          toast.info(`Found ${score.missingKeywords.length} missing keywords that will be added to instructions.`);
        }
      } else {
        throw new Error('Invalid JSON response');
      }    } catch (error) {
      console.error('Error performing combined ATS analysis:', error);
      setAnalysisFailed(true);
      toast.error('Failed to analyze resume. Please check your API key and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-primary', variant: 'default' as const };
    if (score >= 60) return { label: 'Good', color: 'text-secondary-foreground', variant: 'secondary' as const };
    return { label: 'Needs Improvement', color: 'text-destructive', variant: 'destructive' as const };
  };

  const getImpactBadgeVariant = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
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
  const regenerateAnalysis = () => {
    setAnalysisComplete(false);
    setAnalysisFailed(false);
    setCurrentScore(null);
    setSuggestions([]);
    performCombinedAnalysis();
  };

  const retryAnalysis = () => {
    setAnalysisFailed(false);
    performCombinedAnalysis();
  };

  if (!jobDescription || !resumeContent) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* ATS Score Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            ATS Analysis & Scoring
            {isAnalyzing && (
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            )}
            {analysisComplete && (
              <CheckCircle className="h-4 w-4 text-primary" />
            )}
            {currentScore && (
              <Badge variant={getScoreLevel(currentScore.overall).variant} className="ml-auto">
                {currentScore.overall}% ATS Score
              </Badge>
            )}
          </CardTitle>
        </CardHeader>        <CardContent className="space-y-4">
          {analysisFailed && (
            <div className="text-center p-6 space-y-3">
              <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Analysis failed. Please check your API key and try again.
              </p>
              <Button
                onClick={retryAnalysis}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={isAnalyzing}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry Analysis
              </Button>
            </div>
          )}          {isAnalyzing && !analysisFailed && (
            <div className="text-center p-6">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-rose-600" />
              <p className="text-sm text-muted-foreground">
                Performing comprehensive ATS analysis...
              </p>
            </div>
          )}

          {currentScore && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Keyword Match</span>
                    <span className="text-xs font-medium">{currentScore.keywordMatch}%</span>
                  </div>
                  <Progress value={currentScore.keywordMatch} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Skills Alignment</span>
                    <span className="text-xs font-medium">{currentScore.skillsAlignment}%</span>
                  </div>
                  <Progress value={currentScore.skillsAlignment} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Experience Match</span>
                    <span className="text-xs font-medium">{currentScore.experienceMatch}%</span>
                  </div>
                  <Progress value={currentScore.experienceMatch} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Format Compliance</span>
                    <span className="text-xs font-medium">{currentScore.formatCompliance}%</span>
                  </div>
                  <Progress value={currentScore.formatCompliance} className="h-2" />
                </div>
              </div>

              {currentScore.missingKeywords && currentScore.missingKeywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium mb-2 text-muted-foreground">Missing Keywords:</h4>
                  <div className="flex flex-wrap gap-1">
                    {currentScore.missingKeywords.map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {analysisComplete && (
                <Button
                  onClick={regenerateAnalysis}
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  disabled={isAnalyzing}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate Analysis
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ATS Suggestions Section */}
      {suggestions.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ATS Improvement Suggestions
              <Badge variant="outline" className="ml-auto text-xs">
                {suggestions.filter(s => s.selected).length} of {suggestions.length} selected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => toggleAllSuggestions(true)}
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
              >
                <CheckSquare className="h-3 w-3 mr-1" />
                Select All
              </Button>
              <Button
                onClick={() => toggleAllSuggestions(false)}
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
              >
                Clear All
              </Button>
            </div>

            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={suggestion.id}
                    checked={suggestion.selected}
                    onCheckedChange={() => toggleSuggestion(suggestion.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {suggestion.category}
                      </span>
                      <Badge 
                        variant={getImpactBadgeVariant(suggestion.impact)}
                        className="text-xs px-1.5 py-0.5"
                      >
                        {suggestion.impact} impact
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">
                      {suggestion.suggestion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
