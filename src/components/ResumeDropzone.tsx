import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, CheckCircle, Loader2, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface ResumeDropzoneProps {
  onFile: (file: File) => void;
  isLoading: boolean;
  parsedSummary?: { experiences: number; education: number; skills: number } | null;
  error?: string | null;
  onContinue?: () => void;
}

const PARSE_MESSAGES = [
  'Reading your resume...',
  'Extracting experiences...',
  'Identifying skills and education...',
  'Structuring your data...',
  'Almost ready...',
];

export function ResumeDropzone({
  onFile,
  isLoading,
  parsedSummary,
  error,
  onContinue,
}: ResumeDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoading) {
      intervalRef.current = setInterval(() => {
        setMsgIndex((i) => (i + 1) % PARSE_MESSAGES.length);
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setMsgIndex(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoading]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
      // Reset so the same file can be re-selected after an error
      e.target.value = '';
    },
    [onFile]
  );

  if (isLoading) {
    return (
      <div className="border-2 border-dashed border-primary/40 rounded-xl p-10 text-center space-y-4 bg-primary/5">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-sm font-medium text-primary animate-pulse">{PARSE_MESSAGES[msgIndex]}</p>
      </div>
    );
  }

  if (parsedSummary) {
    return (
      <div className="border-2 border-green-400 rounded-xl p-10 text-center space-y-4 bg-green-50 dark:bg-green-950/20">
        <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
        <div className="space-y-1">
          <p className="font-semibold text-green-700 dark:text-green-400">Resume parsed successfully!</p>
          <p className="text-sm text-green-600 dark:text-green-500">
            Found {parsedSummary.experiences} experience{parsedSummary.experiences !== 1 ? 's' : ''} ·{' '}
            {parsedSummary.education} education{' '}
            {parsedSummary.education !== 1 ? 'entries' : 'entry'} ·{' '}
            {parsedSummary.skills} skill group{parsedSummary.skills !== 1 ? 's' : ''}
          </p>
        </div>
        {onContinue && (
          <Button onClick={onContinue} className="gap-2">
            Looks good, continue <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-destructive/40 rounded-xl p-10 text-center space-y-4 bg-destructive/5">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <div className="space-y-1">
          <p className="font-semibold text-destructive">Parsing failed</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          Try a different file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-10 text-center space-y-4 cursor-pointer transition-all ${
        isDragging
          ? 'border-primary bg-primary/10 scale-[1.01]'
          : 'border-border hover:border-primary/60 hover:bg-muted/30'
      }`}
    >
      <div className="mx-auto w-14 h-14 bg-muted rounded-full flex items-center justify-center">
        {isDragging ? (
          <FileText className="h-7 w-7 text-primary" />
        ) : (
          <Upload className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1">
        <p className="font-medium text-sm">
          {isDragging ? 'Drop it here!' : 'Drag & drop your resume or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground">PDF, DOCX, or TXT · Max 5MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
