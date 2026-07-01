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
import { ArrowLeft, Save, RefreshCw, Zap, Download, Upload, RotateCcw, Settings } from 'lucide-react';
import { RequestTokensDialog } from '@/components/RequestTokensDialog';
import { useOnboarding } from '@/lib/onboardingContext';
import { useRef } from 'react';
import type { ResumeProfile } from '@/types/resumeProfile';

export function ProfilePage() {
  const { currentUser } = useAuth();
  const { profile: tokenProfile, tokensRemaining, tokensAllocated, tokensUsed, isAdmin, refetch } = useTokens();
  const { startOnboarding } = useOnboarding();
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

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                : <><Save className="h-4 w-4 mr-2" /> Save Profile</>
              }
            </Button>
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
