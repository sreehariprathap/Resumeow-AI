import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useTokens } from '@/lib/tokenContext';
import { getUserData, saveUserData, updateUserDisplayProfile, exportUserData, importUserData } from '@/lib/firebaseWeb';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, Save, RefreshCw, Zap, Download, Upload, RotateCcw, Settings, Sparkles, FileText } from 'lucide-react';
import { RequestTokensDialog } from '@/components/RequestTokensDialog';
import { useOnboarding } from '@/lib/onboardingContext';
import { useAIService } from '@/hooks/useAIService';
import { compileLatexToPdf, downloadPdf, getResumePdfFilename } from '@/lib/latexCompiler';
import { Textarea } from '@/components/ui/textarea';
import { useRef } from 'react';
import type { ResumeProfile } from '@/types/resumeProfile';
import { Trash2 } from 'lucide-react';

function ProfileDataList({ title, items, onUpdate }: { title: string, items: any[], onUpdate: (newItems: any[]) => void }) {
  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">No data added.</p> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => (
          <div key={idx} className="p-4 border rounded-md relative bg-card shadow-sm flex flex-col group">
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
              const newItems = [...items];
              newItems.splice(idx, 1);
              onUpdate(newItems);
            }}>
               <Trash2 className="h-4 w-4" />
            </Button>
            <div className="text-sm space-y-1.5 pr-8">
              {Object.entries(item).map(([key, value]) => {
                if (value === undefined || value === null || value === '') return null;
                if (key === 'id') return null;
                return (
                  <div key={key} className="break-words">
                    <span className="font-semibold text-foreground/80 capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                    <span className="text-muted-foreground">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


export function ProfilePage() {
  const { currentUser } = useAuth();
  const { profile: tokenProfile, tokensRemaining, tokensAllocated, tokensUsed, isAdmin, refetch } = useTokens();
  const { startOnboarding } = useOnboarding();
  const { makeWritingCall, generateResumeLatex } = useAIService();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumeProfile, setResumeProfile] = useState<Partial<ResumeProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    void getUserData(currentUser.uid, 'resumeProfile')
      .then(data => {
        if (data) {
          const p = data as ResumeProfile;
          setResumeProfile(p);
          setFirstName(p.firstName ?? '');
          setLastName(p.lastName ?? '');
          setPhone(p.phone ?? '');
          setLocation(p.location ?? '');
          setLinkedin(p.linkedin ?? '');
          setWebsite(p.website ?? '');
          setSummary(p.summary ?? '');
        }
      })
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const updated = {
        ...resumeProfile,
        firstName,
        lastName,
        phone,
        location,
        linkedin,
        website,
        summary,
        email: currentUser.email ?? resumeProfile.email ?? '',
        lastUpdated: Date.now(),
      };
      await saveUserData(currentUser.uid, 'resumeProfile', updated as Record<string, unknown>);
      const displayName = `${firstName} ${lastName}`.trim() || (currentUser.displayName ?? '');
      if (displayName) {
        await updateUserDisplayProfile(currentUser.uid, { displayName });
      }
      await refetch();
      toast.success('Profile saved');
    } catch {
      toast.error('Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateArray = async (key: keyof ResumeProfile, newArray: any[]) => {
    if (!currentUser || !resumeProfile) return;
    const updated = { ...resumeProfile, [key]: newArray };
    setResumeProfile(updated);
    await saveUserData(currentUser.uid, 'resumeProfile', updated as Record<string, unknown>);
    toast.success(`${key} updated`);
  };

  const handleRestartOnboarding = () => {
    startOnboarding();
    navigate('/');
  };

  const handleExportData = async () => {
    if (!currentUser) return;
    try {
      const data = await exportUserData(currentUser.uid);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumeow-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export data');
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsedData = JSON.parse(content);
        
        if (window.confirm("This will overwrite your existing data. Are you sure?")) {
          await importUserData(currentUser.uid, parsedData);
          toast.success("Data imported successfully! Please refresh the page.");
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (error) {
        console.error(error);
        toast.error('Invalid JSON file or import failed');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const prompt = `Based on the following profile information, write a highly professional, engaging, and concise Professional Summary (max 4-5 sentences) for a resume. Do not include any explanations, just the summary text itself.
      
      First Name: ${firstName}
      Last Name: ${lastName}
      Location: ${location}
      Experience: ${JSON.stringify(resumeProfile.experiences)}
      Education: ${JSON.stringify(resumeProfile.education)}
      Skills: ${JSON.stringify(resumeProfile.skills)}
      Projects: ${JSON.stringify(resumeProfile.projects)}
      `;
      const generated = await makeWritingCall(prompt);
      setSummary(generated.trim());
      toast.success('Summary generated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const templateRes = await fetch('/templates/sreehari/sreehari.tex');
      if (!templateRes.ok) throw new Error('Could not fetch LaTeX template');
      const templateTex = await templateRes.text();

      const prompt = `You are an expert LaTeX resume formatter.
I have a LaTeX template and some user JSON data. 
I need you to fill out the LaTeX template with the user's data perfectly.
DO NOT change the overall structure or design of the template. 
Replace the dummy data in the template with the provided user data.
Return ONLY the raw, compilable LaTeX code, nothing else. No markdown blocks.

TEMPLATE:
${templateTex}

USER DATA:
${JSON.stringify({ ...resumeProfile, firstName, lastName, phone, location, linkedin, website, summary })}
`;
      const finalLatex = await generateResumeLatex(prompt);
      const pdfBlob = await compileLatexToPdf(finalLatex);
      
      const filename = getResumePdfFilename({ firstName, lastName });
      downloadPdf(pdfBlob, filename);
      toast.success('Resume PDF downloaded successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF. Make sure you have tokens available.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pct = tokensAllocated > 0 ? (tokensRemaining / tokensAllocated) * 100 : 0;
  const tokenColor = pct > 40 ? 'text-green-500' : pct > 15 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Profile</h1>
            <p className="text-sm text-muted-foreground">Edit your personal info and resume details</p>
          </div>
        </div>

        {/* Account info */}
        <Card>
          <CardHeader>
            <div className="font-semibold text-sm">Account</div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-mono">{currentUser?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <Badge variant={tokenProfile?.plan === 'admin' ? 'destructive' : tokenProfile?.plan === 'pro' ? 'default' : 'secondary'}>
                {tokenProfile?.plan ?? 'free'}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tokens remaining</span>
                <span className={`text-sm font-mono font-medium ${tokenColor}`}>
                  {isAdmin ? '∞' : `${tokensRemaining} / ${tokensAllocated}`}
                </span>
              </div>
              {!isAdmin && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct > 40 ? 'bg-green-500' : pct > 15 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{tokensUsed} tokens used</span>
                {!isAdmin && tokensRemaining <= 10 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs gap-1"
                    onClick={() => setTokenDialogOpen(true)}
                  >
                    <Zap className="h-3 w-3" /> Request Tokens
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal info */}
        <Card>
          <CardHeader>
            <div className="font-semibold text-sm">Personal Information</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
            </div>
            <div className="space-y-1.5">
              <Label>LinkedIn URL</Label>
              <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/username" />
            </div>
            <div className="space-y-1.5">
              <Label>Website / Portfolio</Label>
              <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="yoursite.com" />
            </div>

            <div className="space-y-2 col-span-2 mt-2">
              <div className="flex items-center justify-between">
                <Label>Professional Summary</Label>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleGenerateSummary} 
                  disabled={isGeneratingSummary}
                  className="h-7 text-xs gap-1.5"
                >
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                  {isGeneratingSummary ? 'Generating…' : 'Generate with AI'}
                </Button>
              </div>
              <Textarea 
                value={summary} 
                onChange={e => setSummary(e.target.value)} 
                placeholder="Write a brief professional summary..." 
                rows={5}
                className="resize-none"
              />
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                : <><Save className="h-4 w-4 mr-2" /> Save Profile</>
              }
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Resume Data</CardTitle>
              <CardDescription>Advanced editing of your resume data arrays.</CardDescription>
            </div>
            <Button 
              variant="default" 
              onClick={handleDownloadPdf} 
              disabled={isDownloadingPdf}
              className="gap-2"
            >
              {isDownloadingPdf ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {isDownloadingPdf ? 'Generating PDF…' : 'Download as PDF'}
            </Button>
          </CardHeader>
          <CardContent>
                <ProfileDataList title="Experience" items={resumeProfile.experiences || []} onUpdate={(val) => handleUpdateArray('experiences', val)} />
                <ProfileDataList title="Education" items={resumeProfile.education || []} onUpdate={(val) => handleUpdateArray('education', val)} />
                <ProfileDataList title="Projects" items={resumeProfile.projects || []} onUpdate={(val) => handleUpdateArray('projects', val)} />
                <ProfileDataList title="Skills" items={resumeProfile.skills || []} onUpdate={(val) => handleUpdateArray('skills', val)} />
              </CardContent>
            </Card>

        {/* Token request at bottom if many tokens remain — less urgent */}
        {!isAdmin && tokensRemaining > 10 && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={() => setTokenDialogOpen(true)}>
              <Zap className="h-3 w-3" /> Request more tokens
            </Button>
          </div>
        )}

        {/* Data & Account Management */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5 text-primary" />
              Data & Account Management
            </CardTitle>
            <CardDescription>
              Manage your onboarding state and application data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={handleRestartOnboarding} className="w-full sm:w-auto">
                <RotateCcw className="w-4 h-4 mr-2" />
                Restart Onboarding
              </Button>
              
              <Button variant="outline" onClick={handleExportData} className="w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              
              <div>
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleImportData} 
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <RequestTokensDialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen} />
    </div>
  );
}
