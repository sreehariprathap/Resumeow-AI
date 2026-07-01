import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { createTokenRequest } from '@/lib/firebaseWeb';
import { log } from '@/lib/logger';

interface RequestTokensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestTokensDialog({ open, onOpenChange }: RequestTokensDialogProps) {
  const { currentUser } = useAuth();
  const [requestedTokens, setRequestedTokens] = useState('50');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const amount = parseInt(requestedTokens, 10);
    if (isNaN(amount) || amount < 1 || amount > 500) {
      toast.error('Request between 1–500 tokens');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please explain why you need tokens');
      return;
    }
    if (!currentUser) return;

    setIsSubmitting(true);
    log.info('RequestTokensDialog: Submitting token request');
    try {
      await createTokenRequest(
        currentUser.uid,
        currentUser.email ?? '',
        currentUser.displayName ?? currentUser.email ?? '',
        amount,
        reason.trim()
      );
      toast.success('Token request submitted — admin will review shortly');
      onOpenChange(false);
      setReason('');
      setRequestedTokens('50');
    } catch (err) {
      log.error('RequestTokensDialog: Failed to submit token request', { error: err });
      toast.error('Failed to submit request. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" /> Request More Tokens
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            You've used all your tokens. Request more from the admin — they'll review and add them to your account.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="token-amount">How many tokens?</Label>
            <Input
              id="token-amount"
              type="number"
              min={1}
              max={500}
              value={requestedTokens}
              onChange={e => setRequestedTokens(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">1 token ≈ 750 characters of AI output</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Why do you need more tokens?</Label>
            <Textarea
              id="reason"
              placeholder="e.g. I'm actively job hunting and need to tailor several resumes"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
