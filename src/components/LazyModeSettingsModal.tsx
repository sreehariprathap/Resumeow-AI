import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useLazyMode, DEFAULT_LAZY_PROMPT } from '@/lib/lazyModeContext';

export function LazyModeSettingsModal() {
  const { settings, isSettingsOpen, closeSettings, saveSettings } = useLazyMode();

  const [prompt, setPrompt] = useState(settings.defaultPrompt || DEFAULT_LAZY_PROMPT);
  const [autoGenerate, setAutoGenerate] = useState(settings.autoGenerate);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isSettingsOpen) {
      setPrompt(settings.defaultPrompt || DEFAULT_LAZY_PROMPT);
      setAutoGenerate(settings.autoGenerate);
    }
  }, [isSettingsOpen, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings({ defaultPrompt: prompt, autoGenerate });
      toast.success('Lazy Mode configured ⚡');
      closeSettings();
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isSettingsOpen} onOpenChange={(open) => { if (!open) closeSettings(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            ⚡ Lazy Mode Settings
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Set it once. Paste a JD. Get a tailored resume.</p>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Section 1: Default Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">AI System Prompt</Label>
            <p className="text-xs text-muted-foreground">
              This gets prepended to every AI call. Customize the tone, focus, or industry.
            </p>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] text-xs font-mono resize-none"
              placeholder="You are an expert resume writer…"
            />
          </div>

          {/* Section 2: Default Resume */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Resume Profile</Label>
            <p className="text-xs text-muted-foreground">Which profile to use for every generation.</p>
            <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium">Full Profile (default)</p>
                <p className="text-xs text-muted-foreground">Your complete resume profile</p>
              </div>
            </div>
          </div>

          {/* Section 3: Auto-Generate */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="auto-generate" className="text-sm font-semibold cursor-pointer">
                Skip review — go straight to LaTeX
              </Label>
              <p className="text-xs text-muted-foreground">
                When on: paste JD → analysis runs → LaTeX generates automatically.
                When off: you review the analysis before generating.
              </p>
            </div>
            <Switch
              id="auto-generate"
              checked={autoGenerate}
              onCheckedChange={setAutoGenerate}
              className="mt-0.5 shrink-0"
            />
          </div>

          {/* Section 4: Token estimate */}
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Token estimate:</span> Each Lazy Mode run uses ~8–12 tokens (analysis + generation)
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving…' : 'Save Settings'}
            </Button>
            <Button variant="outline" onClick={closeSettings} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
