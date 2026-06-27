import { useState, useEffect, useCallback } from 'react';
import { getUserProfile, type UserProfile } from '../lib/tokens';
import { useAuth } from './useAuth';

export function useTokens() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); return; }
    setIsLoading(true);
    try {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { profile, isLoading, refresh };
}
