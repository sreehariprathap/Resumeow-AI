import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';

export function useSelectedTemplate(currentUser: User | null) {
  const userKey = currentUser ? `user_${currentUser.uid}` : null;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    if (!userKey) return 'no-selection';
    const saved = localStorage.getItem(`${userKey}_selectedTemplateId`);
    return saved && saved !== '' ? saved : 'no-selection';
  });

  const [selectedCoverLetterTemplateId, setSelectedCoverLetterTemplateId] = useState<string>(() => {
    if (!userKey) return 'no-selection';
    const saved = localStorage.getItem(`${userKey}_selectedCoverLetterTemplateId`);
    return saved && saved !== '' ? saved : 'no-selection';
  });

  useEffect(() => {
    if (!userKey || selectedTemplateId === 'no-selection') return;
    localStorage.setItem(`${userKey}_selectedTemplateId`, selectedTemplateId);
  }, [userKey, selectedTemplateId]);

  useEffect(() => {
    if (!userKey || selectedCoverLetterTemplateId === 'no-selection') return;
    localStorage.setItem(`${userKey}_selectedCoverLetterTemplateId`, selectedCoverLetterTemplateId);
  }, [userKey, selectedCoverLetterTemplateId]);

  useEffect(() => {
    if (currentUser) {
      const uk = `user_${currentUser.uid}`;
      const savedResume = localStorage.getItem(`${uk}_selectedTemplateId`);
      const savedCoverLetter = localStorage.getItem(`${uk}_selectedCoverLetterTemplateId`);
      setSelectedTemplateId(savedResume && savedResume !== '' ? savedResume : 'no-selection');
      setSelectedCoverLetterTemplateId(savedCoverLetter && savedCoverLetter !== '' ? savedCoverLetter : 'no-selection');
    } else {
      setSelectedTemplateId('no-selection');
      setSelectedCoverLetterTemplateId('no-selection');
    }
  }, [currentUser]);

  return {
    selectedTemplateId,
    setSelectedTemplateId,
    selectedCoverLetterTemplateId,
    setSelectedCoverLetterTemplateId,
  };
}
