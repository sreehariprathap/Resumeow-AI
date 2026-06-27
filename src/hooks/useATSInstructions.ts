import { useState, useEffect } from 'react';

export function useATSInstructions() {
  const [atsSuggestions, setAtsSuggestions] = useState<string[]>([]);
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);
  const [hasOptionalInstructions, setHasOptionalInstructions] = useState(false);
  const [optionalInstructions, setOptionalInstructions] = useState('');

  useEffect(() => {
    const parts: string[] = [];
    if (missingKeywords.length > 0) {
      parts.push(`--- Missing Keywords to Include ---\nPlease ensure these important keywords are naturally incorporated into the resume: ${missingKeywords.join(', ')}`);
    }
    if (atsSuggestions.length > 0) {
      parts.push(`--- ATS Improvement Suggestions ---\n${atsSuggestions.join('\n\n')}`);
    }
    if (parts.length === 0) return;

    const combined = parts.join('\n\n');
    if (hasOptionalInstructions) {
      const hasKw = optionalInstructions.includes('Missing Keywords to Include');
      const hasSug = optionalInstructions.includes('ATS Improvement Suggestions');
      if (!hasKw || !hasSug) {
        setOptionalInstructions(prev => {
          const cleaned = prev
            .replace(/--- Missing Keywords to Include ---[\s\S]*?(?=---|$)/g, '')
            .replace(/--- ATS Improvement Suggestions ---[\s\S]*?(?=---|$)/g, '')
            .trim();
          return cleaned ? `${cleaned}\n\n${combined}` : combined;
        });
      }
    } else {
      setHasOptionalInstructions(true);
      setOptionalInstructions(combined);
    }
  }, [atsSuggestions, missingKeywords]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    atsSuggestions,
    setAtsSuggestions,
    missingKeywords,
    setMissingKeywords,
    hasOptionalInstructions,
    setHasOptionalInstructions,
    optionalInstructions,
    setOptionalInstructions,
    handleMissingKeywords: (kw: string[]) => setMissingKeywords(kw),
  };
}
