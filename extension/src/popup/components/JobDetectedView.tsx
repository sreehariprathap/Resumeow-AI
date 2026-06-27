import React from 'react';
import type { ScanResult, AIAnswers, FillResult, UserProfile, ResumeProfile } from '../../shared/types';

interface Props {
  scanResult: ScanResult;
  userProfile: UserProfile | null;
  resumeProfile: ResumeProfile | null;
  aiAnswers: AIAnswers | null;
  isGenerating: boolean;
  isFilling: boolean;
  onScan: () => void;
  onGenerateAI: () => void;
  onHighlight: () => void;
  onFill: () => void;
  onFillResult: (r: FillResult) => void;
}

const SITE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  workday: 'Workday',
  glassdoor: 'Glassdoor',
  smartrecruiters: 'SmartRecruiters',
  unknown: 'Job Page',
};

export function JobDetectedView({
  scanResult,
  userProfile,
  resumeProfile,
  aiAnswers,
  isGenerating,
  isFilling,
  onScan,
  onGenerateAI,
  onHighlight,
  onFill,
}: Props) {
  const tokensLeft = userProfile?.tokensRemaining ?? 0;
  const hasJD = scanResult.jobDescription.length > 50;

  return (
    <div className="flex flex-col p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
            R
          </div>
          <span className="font-semibold text-gray-900 text-sm">Resumeow</span>
        </div>
        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
          {tokensLeft} tokens
        </span>
      </div>

      {/* Job detected pill */}
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
        <span className="text-xs font-medium text-green-700">
          Job detected — {SITE_LABELS[scanResult.site] ?? 'Unknown site'}
        </span>
      </div>

      {/* Job info */}
      {(scanResult.jobTitle || scanResult.company) && (
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          {scanResult.jobTitle && (
            <p className="text-sm font-semibold text-gray-900 truncate">{scanResult.jobTitle}</p>
          )}
          {scanResult.company && (
            <p className="text-xs text-gray-500 truncate">{scanResult.company}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {scanResult.fieldCount} fillable field{scanResult.fieldCount !== 1 ? 's' : ''} detected
          </p>
        </div>
      )}

      {/* JD scan info */}
      {hasJD && (
        <p className="text-xs text-gray-400">
          Job description: {scanResult.jobDescription.length.toLocaleString()} chars scanned
        </p>
      )}

      {/* AI answers badge */}
      {aiAnswers && (
        <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI answers ready (cover letter + {Object.keys(aiAnswers).length - 1} more)
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2 mt-1">
        <div className="flex gap-2">
          <button
            onClick={onScan}
            className="flex-1 py-2 text-xs font-medium border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-600 rounded-lg transition-colors"
          >
            Rescan page
          </button>
          <button
            onClick={onHighlight}
            disabled={scanResult.fieldCount === 0}
            className="flex-1 py-2 text-xs font-medium border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-600 rounded-lg transition-colors disabled:opacity-40"
          >
            Highlight fields
          </button>
        </div>

        {!aiAnswers && resumeProfile && hasJD && (
          <button
            onClick={onGenerateAI}
            disabled={isGenerating || tokensLeft < 1}
            className="w-full py-2 text-xs font-medium border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generating AI answers…' : 'Generate AI answers (cover letter + more)'}
          </button>
        )}

        <button
          onClick={onFill}
          disabled={isFilling || !resumeProfile || scanResult.fieldCount === 0}
          className="w-full py-2.5 text-sm font-semibold bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFilling ? 'Filling…' : 'Auto-Fill Application'}
        </button>

        {!resumeProfile && (
          <p className="text-xs text-amber-600 text-center">
            Complete your resume profile first at resumeow.app
          </p>
        )}
      </div>
    </div>
  );
}
