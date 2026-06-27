import { useState, useEffect } from 'react';

export function useFastCompile(jobDescription: string) {
  const [fastCompile, setFastCompile] = useState(false);
  const [fastCompileATS, setFastCompileATS] = useState<boolean>(() => {
    try { return localStorage.getItem('fastCompileATS') !== 'false'; } catch { return true; }
  });
  const [fastSettingsOpen, setFastSettingsOpen] = useState(false);
  const [fastAtsComplete, setFastAtsComplete] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  const handleToggleFastCompileATS = (value: boolean) => {
    setFastCompileATS(value);
    try { localStorage.setItem('fastCompileATS', String(value)); } catch { /* ignore */ }
  };

  useEffect(() => {
    setFastAtsComplete(false);
  }, [jobDescription]);

  return {
    fastCompile, setFastCompile,
    fastCompileATS, handleToggleFastCompileATS,
    fastSettingsOpen, setFastSettingsOpen,
    fastAtsComplete, setFastAtsComplete,
    isCompiling, setIsCompiling,
  };
}
