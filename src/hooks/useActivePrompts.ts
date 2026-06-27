import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { PromptType } from '@/types';

export function useActivePrompts(currentUser: User | null) {
  const [activePrompts, setActivePrompts] = useState<Record<PromptType, string>>(() => {
    if (!currentUser) return { resume: '', coverLetter: '' };
    const uk = `user_${currentUser.uid}`;
    return {
      resume: localStorage.getItem(`${uk}_activePrompt_resume`) ?? '',
      coverLetter: localStorage.getItem(`${uk}_activePrompt_coverLetter`) ?? '',
    };
  });

  useEffect(() => {
    if (currentUser) {
      const uk = `user_${currentUser.uid}`;
      setActivePrompts({
        resume: localStorage.getItem(`${uk}_activePrompt_resume`) ?? '',
        coverLetter: localStorage.getItem(`${uk}_activePrompt_coverLetter`) ?? '',
      });
    } else {
      setActivePrompts({ resume: '', coverLetter: '' });
    }
  }, [currentUser]);

  return { activePrompts, setActivePrompts };
}
