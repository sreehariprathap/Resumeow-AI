import { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { getUserData } from '../lib/firebaseWeb';
import { checkProfileCompletion, type ProfileCompletionStatus } from '../lib/profileCompletion';
import type { ResumeProfile } from '../types/resumeProfile';

export function useProfileGate() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [status, setStatus] = useState<ProfileCompletionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    getUserData(currentUser.uid, 'resumeProfile')
      .then(data => {
        const p = data as ResumeProfile | null;
        setProfile(p);
        setStatus(checkProfileCompletion(p));
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  return { profile, status, loading };
}
