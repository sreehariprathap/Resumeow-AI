import { useState } from 'react';
import { useAuth } from './useAuth';
import { analyzeResume, generateCoverLetter, checkATS, type ATSResult } from '../lib/ai';

export function useAI() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setError(null);
    setIsLoading(true);
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg === 'INSUFFICIENT_TOKENS' ? 'Not enough tokens. Contact admin for more.' : msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    clearError: () => setError(null),
    analyze: (text: string) => run(() => analyzeResume(text, user!.uid)),
    coverLetter: (resume: string, job: string) => run(() => generateCoverLetter(resume, job, user!.uid)),
    atsCheck: (resume: string, job: string) => run<ATSResult>(() => checkATS(resume, job, user!.uid)),
  };
}
