import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useAIService } from '@/hooks/useAIService';
import { extractTextFromFile, parseResumeWithAI, mapParsedToProfile } from '@/lib/resumeParser';
import { ResumeDropzone } from '@/components/ResumeDropzone';
import type { ResumeProfile } from '@/types/resumeProfile';

interface ResumeUploadStepProps {
  onParsed: (profile: Partial<ResumeProfile>) => void;
  onSkip: () => void;
}

export const ResumeUploadStep = ({ onParsed, onSkip }: ResumeUploadStepProps) => {
  const { callForTask } = useAIService();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedSummary, setParsedSummary] = useState<{
    experiences: number;
    education: number;
    skills: number;
  } | null>(null);
  const [parsed, setParsed] = useState<Partial<ResumeProfile> | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Please use a file under 5MB.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setParsedSummary(null);
    setParsed(null);

    try {
      const text = await extractTextFromFile(file);
      const parsedData = await parseResumeWithAI(text, (prompt) => callForTask('resumeParse', prompt));
      const mapped = mapParsedToProfile(parsedData);
      setParsed(mapped);
      setParsedSummary({
        experiences: parsedData.experiences.length,
        education: parsedData.education.length,
        skills: parsedData.skills.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Parsing failed.';
      setError(`${msg} You can still fill in manually.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center space-y-8 py-8">
      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center">
        <FileText className="h-12 w-12 text-white" />
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-bold">Have a resume ready?</h2>
        <p className="text-muted-foreground max-w-md mx-auto text-base">
          Upload it and we'll fill everything for you. You can edit anything before finishing.
        </p>
      </div>

      <ResumeDropzone
        onFile={handleFile}
        isLoading={isLoading}
        parsedSummary={parsedSummary}
        error={error}
        onContinue={() => parsed && onParsed(parsed)}
      />

      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        Start from scratch instead
      </button>
    </div>
  );
};
