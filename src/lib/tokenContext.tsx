import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './authContext';
import { getUserProfile, deductTokens as fbDeductTokens, type UserProfile } from './firebaseWeb';

interface TokenContextType {
  profile: UserProfile | null;
  tokensRemaining: number;
  tokensUsed: number;
  tokensAllocated: number;
  isAdmin: boolean;
  isLoading: boolean;
  deductTokens: (chars: number) => Promise<boolean>;
  refetch: () => Promise<void>;
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
      console.error('Token fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { void refetch(); }, [refetch]);

  const deductTokens = useCallback(async (chars: number): Promise<boolean> => {
    if (!currentUser || !profile) return false;
    if (profile.isAdmin) return true;
    const amount = Math.max(1, Math.ceil(chars / 750));
    if (profile.tokensRemaining < amount) return false;
    const ok = await fbDeductTokens(currentUser.uid, amount);
    if (ok) {
      setProfile(prev => prev ? {
        ...prev,
        tokensUsed: prev.tokensUsed + amount,
        tokensRemaining: prev.tokensRemaining - amount,
      } : prev);
    }
    return ok;
  }, [currentUser, profile]);

  return (
    <TokenContext.Provider value={{
      profile,
      tokensRemaining: profile?.tokensRemaining ?? 0,
      tokensUsed: profile?.tokensUsed ?? 0,
      tokensAllocated: profile?.tokensAllocated ?? 0,
      isAdmin: profile?.isAdmin ?? false,
      isLoading,
      deductTokens,
      refetch,
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
