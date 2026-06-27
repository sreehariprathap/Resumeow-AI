import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  Loader2,
  Pencil,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAIProvider } from '@/lib/aiProviderContext';
import { useAuth } from '@/lib/authContext';
import { getUserData } from '@/lib/firebaseWeb';
import { generateLatexResume } from '@/lib/resumeGenerator';
import type { ResumeProfile } from '@/types/resumeProfile';
import { useOnboarding } from '@/lib/onboardingContext';

export function ResumeGeneratorPage() {
  const { makeAICall } = useAIProvider();
  const { currentUser } = useAuth();
  const { startOnboarding } = useOnboarding();

  const [latex, setLatex] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('generatedLatex');
    if (stored) {
      setLatex(stored);
      setIsLoading(false);
    }

    if (currentUser) {
      getUserData(currentUser.uid, 'resumeProfile')
        .then((data) => {
          if (data) setProfile(data as ResumeProfile);
          if (!stored) setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    } else {
      if (!stored) setIsLoading(false);
    }
  }, [currentUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(latex).then(() => {
      toast.success('LaTeX copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard.');
    });
  };

  const handleDownload = () => {
    const name = profile
      ? `${profile.firstName}_${profile.lastName}_Resume.tex`
      : 'resume.tex';
    const blob = new Blob([latex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  const handleRegenerate = async () => {
    if (!profile) {
      toast.error('No profile loaded. Please edit your profile first.');
      return;
    }
    setIsRegenerating(true);
    try {
      const newLatex = await generateLatexResume(profile, makeAICall);
      setLatex(newLatex);
      sessionStorage.setItem('generatedLatex', newLatex);
      toast.success('Resume regenerated!');
    } catch {
      toast.error('Regeneration failed. Check your AI settings.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleEditProfile = () => {
    startOnboarding();
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading your resume...</p>
        </div>
      </div>
    );
  }

  if (!latex) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-5">
        <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">No resume generated yet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete the profile wizard to generate your LaTeX resume.
          </p>
        </div>
        <Button onClick={handleEditProfile}>
          <Pencil className="h-4 w-4 mr-2" /> Build My Resume
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Your Resume</h1>
          {profile && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {profile.firstName} {profile.lastName} · {profile.targetRoles?.slice(0, 2).join(', ')}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="text-xs">LaTeX / Jake's Resume Template</Badge>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleCopy} className="gap-2">
          <Copy className="h-4 w-4" /> Copy LaTeX
        </Button>
        <Button variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" /> Download .tex
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open('https://www.overleaf.com/project', '_blank')}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" /> Compile on Overleaf
        </Button>
        <Button
          variant="outline"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="gap-2"
        >
          {isRegenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Regenerate
        </Button>
        <Button variant="ghost" onClick={handleEditProfile} className="gap-2">
          <Pencil className="h-4 w-4" /> Edit Profile
        </Button>
      </div>

      {/* Overleaf instructions */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>To compile:</strong> Click "Compile on Overleaf" → New Project → Blank Project → paste the LaTeX code → click Recompile.
          </p>
        </CardContent>
      </Card>

      {/* LaTeX output */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" /> LaTeX Source
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative">
            <pre className="overflow-auto max-h-[600px] p-4 text-xs font-mono leading-relaxed bg-muted/40 rounded-b-lg whitespace-pre-wrap break-all">
              <code>{latex}</code>
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border text-xs flex items-center gap-1"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
