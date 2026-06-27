import { useTokens } from '@/lib/tokenContext';
import { Zap } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

export function TokenBadge() {
  const { tokensRemaining, tokensAllocated, isLoading, isAdmin } = useTokens();

  if (isLoading) return null;
  if (isAdmin) return (
    <Badge variant="outline" className="gap-1 text-xs">
      <Zap className="h-3 w-3 text-yellow-500" />
      <span>Admin</span>
    </Badge>
  );

  const pct = tokensAllocated > 0 ? tokensRemaining / tokensAllocated : 0;
  const colorClass = pct > 0.4 ? 'text-green-500' : pct > 0.15 ? 'text-yellow-500' : 'text-red-500';

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-xs font-medium cursor-default', colorClass)}
      title={`${tokensRemaining} of ${tokensAllocated} tokens remaining`}
    >
      <Zap className={cn('h-3 w-3', colorClass)} />
      <span>{tokensRemaining} tokens</span>
    </Badge>
  );
}
