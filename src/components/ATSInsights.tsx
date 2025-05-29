import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, Award } from 'lucide-react';

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

interface ATSInsightsProps {
  originalScore: ATSScore;
  improvedScore: ATSScore;
  className?: string;
}

export function ATSInsights({ originalScore, improvedScore, className }: ATSInsightsProps) {
  const getTrendIcon = (original: number, improved: number) => {
    if (improved > original) return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (improved < original) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getImprovementBadge = (original: number, improved: number) => {
    const diff = improved - original;
    if (diff > 0) return { variant: 'default' as const, text: `+${diff}%`, color: 'text-emerald-600' };
    if (diff < 0) return { variant: 'destructive' as const, text: `${diff}%`, color: 'text-red-400' };
    return { variant: 'secondary' as const, text: '0%', color: 'text-gray-600' };
  };

  const getScoreLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-600' };
    return { label: 'Needs Improvement', color: 'text-red-400' };
  };

  const categories = [
    { 
      label: 'Overall ATS Score', 
      original: originalScore.overall, 
      improved: improvedScore.overall,
      icon: <Target className="h-4 w-4" />
    },
    { 
      label: 'Keyword Matching', 
      original: originalScore.keywordMatch, 
      improved: improvedScore.keywordMatch,
      icon: <BarChart3 className="h-4 w-4" />
    },
    { 
      label: 'Skills Alignment', 
      original: originalScore.skillsAlignment, 
      improved: improvedScore.skillsAlignment,
      icon: <Award className="h-4 w-4" />
    },
    { 
      label: 'Experience Match', 
      original: originalScore.experienceMatch, 
      improved: improvedScore.experienceMatch,
      icon: <TrendingUp className="h-4 w-4" />
    },
  ];

  const overallImprovement = improvedScore.overall - originalScore.overall;
  const totalImprovements = categories.filter(cat => cat.improved > cat.original).length;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-rose-600" />
          Resume Improvement Insights
          <Badge 
            variant={overallImprovement > 0 ? 'default' : overallImprovement < 0 ? 'destructive' : 'secondary'}
            className="ml-auto"
          >
            {overallImprovement > 0 ? '+' : ''}{overallImprovement}% Overall
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-rose-600">{totalImprovements}/4</div>
            <div className="text-sm text-muted-foreground">Categories Improved</div>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className={`text-2xl font-bold ${getScoreLevel(improvedScore.overall).color}`}>
              {improvedScore.overall}%
            </div>
            <div className="text-sm text-muted-foreground">
              New ATS Score ({getScoreLevel(improvedScore.overall).label})
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
              const improvement = getImprovementBadge(category.original, category.improved);
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <span className="text-sm font-medium">{category.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {category.original}% → {category.improved}%
                      </span>
                      {getTrendIcon(category.original, category.improved)}
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
                        <span>{category.improved}%</span>
                      </div>
                      <Progress value={category.improved} className="h-2" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Improvements */}
        {improvedScore.missingKeywords.length < originalScore.missingKeywords.length && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-emerald-600">✓ Keywords Added</h4>
            <div className="flex flex-wrap gap-1">
              {originalScore.missingKeywords
                .filter(keyword => !improvedScore.missingKeywords.includes(keyword))
                .map((keyword, index) => (
                  <Badge key={index}  className="text-xs ">
                    {keyword}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Still Missing Keywords */}
        {improvedScore.missingKeywords.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-orange-600">Keywords Still Missing</h4>
            <div className="flex flex-wrap gap-1">
              {improvedScore.missingKeywords.map((keyword, index) => (
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
            {improvedScore.overall >= 80 && (
              <p className="text-emerald-600">
                ✓ Your resume now has excellent ATS compatibility
              </p>
            )}
            {improvedScore.overall < originalScore.overall && (
              <p className="text-orange-600">
                ⚠ Some scores decreased - consider reviewing the changes made
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
