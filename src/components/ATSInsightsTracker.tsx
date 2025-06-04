import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, Award, RefreshCw, CheckCircle } from 'lucide-react';
import { useAIService } from '@/hooks/useAIService';

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

interface ATSInsightsTrackerProps {
  jobDescription: string;
  originalResume: string;
  tailoredResume: string;
  autoAnalyze?: boolean;
  initialScore?: ATSScore | null; // Pre-computed initial score
}

export function ATSInsightsTracker({ 
  jobDescription, 
  originalResume, 
  tailoredResume,
  autoAnalyze = true,
  initialScore = null
}: ATSInsightsTrackerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [originalScore, setOriginalScore] = useState<ATSScore | null>(null);
  const [tailoredScore, setTailoredScore] = useState<ATSScore | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const { analyzeATSScore, hasAvailableProviders } = useAIService();

  // Auto-analyze when all data is available
  useEffect(() => {
    const runAnalysis = async () => {
      if (autoAnalyze && jobDescription && tailoredResume && !analysisComplete) {
        // If we have an initial score, use it; otherwise analyze the original resume
        if (initialScore) {
          setOriginalScore(initialScore);
          await analyzeOnlyTailored();
        } else if (originalResume) {
          await analyzeComparison();
        }
      }    };
    
    runAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyze, jobDescription, originalResume, tailoredResume, analysisComplete, initialScore]);  const analyzeResume = useCallback(async (resumeContent: string): Promise<ATSScore | null> => {
    if (!jobDescription || !resumeContent) {
      toast.error('Job description and resume content are required');
      return null;
    }

    try {
      return await analyzeATSScore(jobDescription, resumeContent);
    } catch (error) {
      console.error('Error analyzing resume:', error);
      toast.error('Failed to analyze resume. Please try again.');
      return null;
    }
  }, [jobDescription, analyzeATSScore]);const analyzeComparison = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    
    try {
      // Analyze both resumes in parallel
      const [originalResult, tailoredResult] = await Promise.all([
        analyzeResume(originalResume),
        analyzeResume(tailoredResume)
      ]);
      
      if (originalResult && tailoredResult) {
        setOriginalScore(originalResult);
        setTailoredScore(tailoredResult);
        setAnalysisComplete(true);
        
        const improvement = tailoredResult.overall - originalResult.overall;
        if (improvement > 0) {
          toast.success(`Resume improved! ATS score increased by ${improvement} points.`);
        } else if (improvement < 0) {
          toast.error(`ATS score decreased by ${Math.abs(improvement)} points. Consider reviewing changes.`);
        } else {
          toast.success('Analysis complete. ATS scores are similar.');
        }
      }
    } finally {
      setIsAnalyzing(false);
    }  }, [originalResume, tailoredResume, analyzeResume]);

  const analyzeOnlyTailored = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    
    try {
      // Only analyze the tailored resume since we have the initial score
      const tailoredResult = await analyzeResume(tailoredResume);
      
      if (tailoredResult) {
        setTailoredScore(tailoredResult);
        setAnalysisComplete(true);
        
        const improvement = tailoredResult.overall - (initialScore?.overall || 0);
        if (improvement > 0) {
          toast.success(`Resume improved! ATS score increased by ${improvement} points.`);
        } else if (improvement < 0) {
          toast.error(`ATS score decreased by ${Math.abs(improvement)} points. Consider reviewing changes.`);
        } else {
          toast.success('Analysis complete. ATS scores are similar.');
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [tailoredResume, initialScore, analyzeResume]);

  const getTrendIcon = (original: number, tailored: number) => {
    if (tailored > original) return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (tailored < original) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getImprovementBadge = (original: number, tailored: number) => {
    const diff = tailored - original;
    if (diff > 0) return { variant: 'default' as const, text: `+${diff}%`, color: 'text-emerald-600' };
    if (diff < 0) return { variant: 'destructive' as const, text: `${diff}%`, color: 'text-red-400' };
    return { variant: 'secondary' as const, text: '0%', color: 'text-gray-600' };
  };
  const getScoreLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-600' };
    return { label: 'Needs Improvement', color: 'text-red-400' };
  };

  if (!originalResume || !tailoredResume) {
    return null;
  }

  const categories = originalScore && tailoredScore ? [
    { 
      label: 'Overall ATS Score', 
      original: originalScore.overall, 
      tailored: tailoredScore.overall,
      icon: <Target className="h-4 w-4" />
    },
    { 
      label: 'Keyword Matching', 
      original: originalScore.keywordMatch, 
      tailored: tailoredScore.keywordMatch,
      icon: <BarChart3 className="h-4 w-4" />
    },
    { 
      label: 'Skills Alignment', 
      original: originalScore.skillsAlignment, 
      tailored: tailoredScore.skillsAlignment,
      icon: <Award className="h-4 w-4" />
    },
    { 
      label: 'Experience Match', 
      original: originalScore.experienceMatch, 
      tailored: tailoredScore.experienceMatch,
      icon: <TrendingUp className="h-4 w-4" />
    },
  ] : [];

  const overallImprovement = originalScore && tailoredScore ? tailoredScore.overall - originalScore.overall : 0;
  const totalImprovements = categories.filter(cat => cat.tailored > cat.original).length;

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-rose-600" />
          Resume Improvement Insights
          {isAnalyzing && (
            <RefreshCw className="h-4 w-4 animate-spin text-rose-600" />
          )}
          {analysisComplete && (
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          )}
          {originalScore && tailoredScore && (
            <Badge 
              variant={overallImprovement > 0 ? 'default' : overallImprovement < 0 ? 'destructive' : 'secondary'}
              className="ml-auto"
            >
              {overallImprovement > 0 ? '+' : ''}{overallImprovement}% Overall
            </Badge>
          )}
        </CardTitle>
      </CardHeader>      <CardContent className="space-y-6">
        {!hasAvailableProviders() && (
          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
            API key is required for ATS analysis. Please add it in Settings.
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center p-6">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-rose-600" />
            <p className="text-sm text-muted-foreground">
              Analyzing your resume improvements...
            </p>
          </div>
        )}

        {originalScore && tailoredScore && !isAnalyzing && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-rose-600">{totalImprovements}/4</div>
                <div className="text-sm text-muted-foreground">Categories Improved</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className={`text-2xl font-bold ${getScoreLevel(tailoredScore.overall).color}`}>
                  {tailoredScore.overall}%
                </div>
                <div className="text-sm text-muted-foreground">
                  New ATS Score ({getScoreLevel(tailoredScore.overall).label})
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className={`text-2xl font-bold ${overallImprovement > 0 ? 'text-emerald-600' : overallImprovement < 0 ? 'text-red-400' : 'text-gray-600'}`}>
                  {overallImprovement > 0 ? '+' : ''}{overallImprovement}%
                </div>
                <div className="text-sm text-muted-foreground">Improvement</div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-4">
              <h3 className="text-md font-medium">Score Breakdown</h3>
              
              <div className="space-y-3">
                {categories.map((category, index) => {
                  const improvement = getImprovementBadge(category.original, category.tailored);
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {category.icon}
                          <span className="text-sm font-medium">{category.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {category.original}% → {category.tailored}%
                          </span>
                          {getTrendIcon(category.original, category.tailored)}
                          <Badge variant={improvement.variant} className="text-xs">
                            {improvement.text}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Original</span>
                            <span>{category.original}%</span>
                          </div>
                          <Progress value={category.original} className="h-2 bg-gray-200" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Improved</span>
                            <span>{category.tailored}%</span>
                          </div>
                          <Progress value={category.tailored} className="h-2" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key Improvements */}
            {tailoredScore.missingKeywords.length < originalScore.missingKeywords.length && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-emerald-600">✓ Keywords Added</h4>
                <div className="flex flex-wrap gap-1">
                  {originalScore.missingKeywords
                    .filter(keyword => !tailoredScore.missingKeywords.includes(keyword))
                    .map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs ">
                        {keyword}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Still Missing Keywords */}
            {tailoredScore.missingKeywords.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-orange-600">Keywords Still Missing</h4>
                <div className="flex flex-wrap gap-1">
                  {tailoredScore.missingKeywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs ">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Summary */}
            <div className="p-4 border rounded-lg bg-accent/5">
              <h4 className="text-sm font-medium mb-2">Performance Summary</h4>
              <div className="text-sm space-y-1">
                {overallImprovement > 0 && (
                  <p className="text-emerald-600">
                    ✓ Your resume's ATS compatibility improved by {overallImprovement} percentage points
                  </p>
                )}
                {totalImprovements > 0 && (
                  <p className="text-rose-600">
                    ✓ {totalImprovements} out of 4 key areas showed improvement
                  </p>
                )}
                {tailoredScore.overall >= 80 && (
                  <p className="text-emerald-600">
                    ✓ Your resume now has excellent ATS compatibility
                  </p>
                )}
                {overallImprovement < 0 && (
                  <p className="text-orange-600">
                    ⚠ Some scores decreased - consider reviewing the changes made
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
