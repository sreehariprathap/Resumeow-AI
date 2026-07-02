import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './authContext';
import { getUserProfile, deductTokens as fbDeductTokens, type UserProfile } from './firebaseWeb';
import { log } from '@/lib/logger';
import { evaluateTokenBalance, InsufficientTokensForCallError } from './tokenBalance';

export { InsufficientTokensForCallError, evaluateTokenBalance, type BalanceOutcome } from './tokenBalance';

interface TokenContextType {
  profile: UserProfile | null;
  tokensRemaining: number;
  tokensUsed: number;
  tokensAllocated: number;
  isAdmin: boolean;
  plan: 'free' | 'pro' | 'admin';
  isLoading: boolean;
  deductTokens: (chars: number) => Promise<boolean>;
  refetch: () => Promise<void>;
  assertSufficientBalance: (estimatedTokens: number) => Promise<void>;
}

const TokenContext = createContext<TokenContextType | null>(null);

export function TokenProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!currentUser) { setProfile(null); setIsLoading(false); return; }
    try {
      const p = await getUserProfile(currentUser.uid);
      setProfile(p);
    } catch (e) {
      log.error('Token fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { void refetch(); }, [refetch]);

  const deductTokens = useCallback(async (chars: number): Promise<boolean> => {
    if (!currentUser) return false;
    // Admins never pay — check local profile first since it's fast
    if (profile?.isAdmin) return true;
    const amount = Math.max(1, Math.ceil(chars / 750));
    // Firestore is authoritative — skip stale local pre-check, let the DB decide
    const ok = await fbDeductTokens(currentUser.uid, amount);
    if (ok) {
      // Optimistic local update so UI reflects immediately without a refetch
      setProfile(prev => prev ? {
        ...prev,
        tokensUsed: prev.tokensUsed + amount,
        tokensRemaining: Math.max(0, prev.tokensRemaining - amount),
      } : prev);
    } else {
      // Deduction failed (insufficient balance or doc missing) — sync local state
      void refetch();
    }
    return ok;
  }, [currentUser, profile, refetch]);

  // Fetches a fresh balance from Firestore before each AI call to avoid stale local state.
  // estimatedTokens: the pre-flight cost estimate for THIS specific call (see llm.config.ts's
  // estimateTokensForTask). A true zero balance always throws the plain INSUFFICIENT_TOKENS
  // error; a positive-but-insufficient balance throws InsufficientTokensForCallError instead,
  // so callers can distinguish "you're fully out" from "you're a bit short for this one thing".
  const assertSufficientBalance = useCallback(async (estimatedTokens: number): Promise<void> => {
    if (!currentUser) return;
    let fresh: UserProfile | null = null;
    try {
      fresh = await getUserProfile(currentUser.uid);
    } catch {
      // Offline or Firestore rules blocked read — fail open, don't block the call
      log.warn('[tokens] Balance check skipped (offline or permission error)');
      return;
    }
    const outcome = evaluateTokenBalance(fresh, estimatedTokens);
    if (outcome.ok) return;
    if (outcome.reason === 'zero') throw new Error('INSUFFICIENT_TOKENS');
    throw new InsufficientTokensForCallError(outcome.needed, outcome.remaining);
  }, [currentUser]);

  return (
    <TokenContext.Provider value={{
      profile,
      tokensRemaining: profile?.tokensRemaining ?? 0,
      tokensUsed: profile?.tokensUsed ?? 0,
      tokensAllocated: profile?.tokensAllocated ?? 0,
      isAdmin: profile?.isAdmin ?? false,
      plan: profile?.plan ?? 'free',
      isLoading,
      deductTokens,
      refetch,
      assertSufficientBalance,
    }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useTokens() {
  const ctx = useContext(TokenContext);
  if (!ctx) throw new Error('useTokens must be used within TokenProvider');
  return ctx;
}
