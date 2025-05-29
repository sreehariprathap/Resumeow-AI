import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';
import { AlertCircle, BarChart3, RefreshCw, CheckCircle, Target, Award } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { getUserData } from '@/lib/firebase';

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

interface InitialATSAnalysisProps {
  jobDescription: string;
  resumeContent: string;
  onAnalysisComplete: (score: ATSScore) => void;
  onMissingKeywords: (keywords: string[]) => void;
  disabled?: boolean;
}

export function InitialATSAnalysis({ 
  jobDescription, 
  resumeContent, 
  onAnalysisComplete,
  onMissingKeywords,
  disabled = false
}: InitialATSAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [currentScore, setCurrentScore] = useState<ATSScore | null>(null);
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
  // Auto-analyze when all data is available
  useEffect(() => {
    if (apiKey && jobDescription && resumeContent && !disabled && !analysisComplete) {
      analyzeResume();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, jobDescription, resumeContent, disabled, analysisComplete]);

  const analyzeResume = async (): Promise<void> => {
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
Analyze this resume against the job description and provide an ATS (Applicant Tracking System) compatibility score.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeContent}

Please analyze and return a JSON response with the following structure:
{
  "overall": <number 0-100>,
  "keywordMatch": <number 0-100>,
  "skillsAlignment": <number 0-100>,
  "experienceMatch": <number 0-100>,
  "formatCompliance": <number 0-100>,
  "feedback": [<array of specific feedback points>],
  "missingKeywords": [<array of important keywords missing from resume>],
  "recommendations": [<array of actionable recommendations to improve ATS score>]
}

Consider:
- Keyword density and relevance
- Skills mentioned in job description vs resume
- Experience level and requirements match
- ATS-friendly formatting
- Industry-specific terminology
- Required qualifications coverage

Focus particularly on identifying ALL missing keywords from the job description that should be in the resume.
Provide specific, actionable feedback. Return only valid JSON.
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
        const score = JSON.parse(jsonMatch[0]);
        setCurrentScore(score);
        setAnalysisComplete(true);
        
        // Notify parent components
        onAnalysisComplete(score);
        onMissingKeywords(score.missingKeywords || []);
        
        toast.success(`Initial ATS analysis complete! Score: ${score.overall}%`);
        
        if (score.missingKeywords && score.missingKeywords.length > 0) {
          toast.info(`Found ${score.missingKeywords.length} missing keywords that will be added to instructions.`);
        }
      } else {
        throw new Error('Invalid JSON response');
      }
    } catch (error) {
      console.error('Error analyzing resume:', error);
      toast.error('Failed to analyze resume. Please check your API key and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', variant: 'default' as const };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-600', variant: 'secondary' as const };
    return { label: 'Needs Improvement', color: 'text-red-600', variant: 'destructive' as const };
  };

  if (!jobDescription || !resumeContent) {
    return null;
  }

  return (
    <Card className="w-full mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Initial ATS Analysis
          {isAnalyzing && (
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          )}
          {analysisComplete && (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          {currentScore && (
            <Badge variant={getScoreLevel(currentScore.overall).variant} className="ml-auto">
              {currentScore.overall}% ATS Score
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

        {isAnalyzing && (
          <div className="text-center p-6">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm text-muted-foreground">
              Analyzing your resume against the job description...
            </p>
          </div>
        )}

        {currentScore && !isAnalyzing && (
          <>
            {/* Score Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">Keywords</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={currentScore.keywordMatch} className="w-16 h-2" />
                  <Badge variant={getScoreLevel(currentScore.keywordMatch).variant} className="text-xs">
                    {currentScore.keywordMatch}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span className="text-sm font-medium">Skills</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={currentScore.skillsAlignment} className="w-16 h-2" />
                  <Badge variant={getScoreLevel(currentScore.skillsAlignment).variant} className="text-xs">
                    {currentScore.skillsAlignment}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm font-medium">Experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={currentScore.experienceMatch} className="w-16 h-2" />
                  <Badge variant={getScoreLevel(currentScore.experienceMatch).variant} className="text-xs">
                    {currentScore.experienceMatch}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Format</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={currentScore.formatCompliance} className="w-16 h-2" />
                  <Badge variant={getScoreLevel(currentScore.formatCompliance).variant} className="text-xs">
                    {currentScore.formatCompliance}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Missing Keywords */}
            {currentScore.missingKeywords.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-600">🚨 Missing Keywords ({currentScore.missingKeywords.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {currentScore.missingKeywords.map((keyword, index) => (
                    <Badge key={index} variant="destructive" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground p-2 bg-red-50 border border-red-200 rounded">
                  💡 These keywords will be automatically added to your prompt instructions to improve ATS compatibility.
                </div>
              </div>
            )}

            {/* Recommendations Preview */}
            {currentScore.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Quick Recommendations</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {currentScore.recommendations.slice(0, 3).map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                  {currentScore.recommendations.length > 3 && (
                    <li className="text-blue-600">+ {currentScore.recommendations.length - 3} more recommendations available in suggestions section</li>
                  )}
                </ul>
              </div>
            )}

            {/* Overall Assessment */}
            <div className="p-3 border rounded-lg bg-accent/5">
              <div className="text-sm font-medium mb-1">Assessment Summary</div>
              <div className="text-xs text-muted-foreground">
                Your resume has a <strong className={getScoreLevel(currentScore.overall).color}>
                  {getScoreLevel(currentScore.overall).label}
                </strong> ATS compatibility score. 
                {currentScore.overall < 70 && " Focus on adding missing keywords and improving skill alignment."}
                {currentScore.overall >= 70 && currentScore.overall < 85 && " Good foundation - optimize keywords and formatting for better results."}
                {currentScore.overall >= 85 && " Excellent! Minor optimizations will make it even stronger."}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
