import { useState } from 'react';
import { useTokens } from '@/lib/tokenContext';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';
import { RequestTokensDialog } from './RequestTokensDialog';

export function InsufficientTokensBanner() {
  const { tokensRemaining, isAdmin, isLoading } = useTokens();
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);

  if (isLoading || isAdmin || tokensRemaining > 0) return null;

  return (
    <>
      <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-2.5">
        <div className="container flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>AI functions disabled — you're out of tokens. Request more, or contact support if this looks wrong.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setTokenDialogOpen(true)}>
              Request Tokens
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href="mailto:sreehariprathap1996@gmail.com" target="_blank" rel="noreferrer">
                Contact Support
              </a>
            </Button>
          </div>
        </div>
      </div>
      <RequestTokensDialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen} />
    </>
  );
}
