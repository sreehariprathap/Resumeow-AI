import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';
import { TrendingUp, TrendingDown, Minus, BarChart3, FileText, Target } from 'lucide-react';
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

interface ATSScoreTrackerProps {
  jobDescription: string;
  originalResume?: string;
  tailoredResume?: string;
  showComparison?: boolean;
}

export function ATSScoreTracker({ 
  jobDescription, 
  originalResume, 
  tailoredResume,
  showComparison = false 
}: ATSScoreTrackerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [originalScore, setOriginalScore] = useState<ATSScore | null>(null);
  const [tailoredScore, setTailoredScore] = useState<ATSScore | null>(null);
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

  const analyzeResume = async (resumeContent: string): Promise<ATSScore | null> => {
    if (!apiKey) {
      toast.error('Google API key is required. Please add it in Settings.');
      return null;
    }

    if (!jobDescription || !resumeContent) {
      toast.error('Job description and resume content are required');
      return null;
    }

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

Provide specific, actionable feedback. Return only valid JSON.
`;      const response = await ai.models.generateContent({
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
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response');
      }
    } catch (error) {
      console.error('Error analyzing resume:', error);
      toast.error('Failed to analyze resume. Please check your API key and try again.');
      return null;
    }
  };

  const analyzeOriginalResume = async () => {
    if (!originalResume) return;
    
    setIsAnalyzing(true);
    try {
      const score = await analyzeResume(originalResume);
      if (score) {
        setOriginalScore(score);
        toast.success('Original resume analyzed successfully!');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeTailoredResume = async () => {
    if (!tailoredResume) return;
    
    setIsAnalyzing(true);
    try {
      const score = await analyzeResume(tailoredResume);
      if (score) {
        setTailoredScore(score);
        toast.success('Tailored resume analyzed successfully!');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };
  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getTrendIcon = (original: number, tailored: number) => {
    if (tailored > original) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (tailored < original) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const ScoreCard = ({ title, score, icon }: { title: string; score: number; icon: React.ReactNode }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={score} className="w-16 h-2" />
        <Badge variant={getScoreBadgeVariant(score)} className="text-xs">
          {score}%
        </Badge>
      </div>
    </div>
  );

  const ScoreSection = ({ title, score, isComparison = false }: { title: string; score: ATSScore; isComparison?: boolean }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant={getScoreBadgeVariant(score.overall)} className="text-sm">
          Overall: {score.overall}%
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ScoreCard 
          title="Keywords" 
          score={score.keywordMatch} 
          icon={<Target className="h-4 w-4" />} 
        />
        <ScoreCard 
          title="Skills" 
          score={score.skillsAlignment} 
          icon={<BarChart3 className="h-4 w-4" />} 
        />
        <ScoreCard 
          title="Experience" 
          score={score.experienceMatch} 
          icon={<FileText className="h-4 w-4" />} 
        />
        <ScoreCard 
          title="Format" 
          score={score.formatCompliance} 
          icon={<FileText className="h-4 w-4" />} 
        />
      </div>

      {!isComparison && (
        <>
          {score.missingKeywords.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Missing Keywords:</h4>
              <div className="flex flex-wrap gap-1">
                {score.missingKeywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {score.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Recommendations:</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {score.recommendations.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );

  const ComparisonView = () => {
    if (!originalScore || !tailoredScore) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Score Improvement</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { label: 'Overall', original: originalScore.overall, tailored: tailoredScore.overall },
            { label: 'Keywords', original: originalScore.keywordMatch, tailored: tailoredScore.keywordMatch },
            { label: 'Skills', original: originalScore.skillsAlignment, tailored: tailoredScore.skillsAlignment },
            { label: 'Experience', original: originalScore.experienceMatch, tailored: tailoredScore.experienceMatch },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.original}% → {item.tailored}%</span>
                  {getTrendIcon(item.original, item.tailored)}
                </div>
              </div>
              <Badge 
                variant={item.tailored > item.original ? 'default' : item.tailored < item.original ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {item.tailored > item.original ? '+' : ''}{item.tailored - item.original}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          ATS Score Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!apiKey && (
          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
            Google API key is required for ATS analysis. Please add it in Settings.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {originalResume && (
            <Button 
              onClick={analyzeOriginalResume} 
              disabled={isAnalyzing || !apiKey || !jobDescription}
              size="sm"
              variant="outline"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Original Resume'}
            </Button>
          )}
          
          {tailoredResume && (
            <Button 
              onClick={analyzeTailoredResume} 
              disabled={isAnalyzing || !apiKey || !jobDescription}
              size="sm"
              variant="outline"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Tailored Resume'}
            </Button>
          )}
        </div>

        {showComparison && originalScore && tailoredScore && <ComparisonView />}

        {originalScore && (
          <ScoreSection 
            title="Original Resume Score" 
            score={originalScore} 
            isComparison={showComparison && !!tailoredScore}
          />
        )}

        {tailoredScore && (
          <ScoreSection 
            title="Tailored Resume Score" 
            score={tailoredScore} 
            isComparison={showComparison && !!originalScore}
          />
        )}
      </CardContent>
    </Card>
  );
}
