import React, { useState } from 'react';
import type {
  ScanResult,
  AIAnswers,
  FillResult,
  UserProfile,
  ResumeProfileOption,
} from '../../shared/types';

interface Props {
  scanResult: ScanResult;
  userProfile: UserProfile | null;
  profiles: ResumeProfileOption[];
  selectedProfileId: string;
  onSelectProfile: (id: string) => void;
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
  icims: 'iCIMS',
  taleo: 'Taleo',
  successfactors: 'SAP SuccessFactors',
  unknown: 'Job Page',
};

const WORKDAY_STEP_LABELS: Record<string, string> = {
  'my-information': 'Step: My Information',
  'my-experience': 'Step: My Experience',
  'application-questions': 'Step: Application Questions',
  'self-identify': 'Step: Self Identify',
  'voluntary-disclosures': 'Step: Voluntary Disclosures',
  'review': 'Step: Review',
};

export function JobDetectedView({
  scanResult,
  userProfile,
  profiles,
  selectedProfileId,
  onSelectProfile,
  aiAnswers,
  isGenerating,
  isFilling,
  onScan,
  onGenerateAI,
  onHighlight,
  onFill,
}: Props) {
  const [showFullJD, setShowFullJD] = useState(false);
  const tokensLeft = userProfile?.tokensRemaining ?? 0;
  const hasJD = scanResult.jobDescription.length > 50;
  const hasProfile = profiles.length > 0;
  const isWorkday = scanResult.site === 'workday';
  const workdayStep = scanResult.workdayStep;
  const canFill = hasProfile && (scanResult.isApplicationPage || scanResult.fieldCount > 0);

  const jdPreview = hasJD
    ? scanResult.jobDescription.slice(0, 200).replace(/\s+/g, ' ').trim()
    : '';

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

      {/* Site pill */}
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
        <span className="text-xs font-medium text-green-700 flex-1">
          {SITE_LABELS[scanResult.site] ?? 'Job page'} detected
        </span>
        {isWorkday && workdayStep && workdayStep !== 'unknown' && (
          <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
            {WORKDAY_STEP_LABELS[workdayStep] ?? workdayStep}
          </span>
        )}
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
            {scanResult.isJobListingPage
              ? 'Job listing — open the application to fill fields'
              : `${scanResult.fieldCount} fillable field${scanResult.fieldCount !== 1 ? 's' : ''} detected`}
          </p>
        </div>
      )}

      {/* JD preview */}
      {hasJD && (
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
          <span>
            {showFullJD ? scanResult.jobDescription.slice(0, 600) : jdPreview}
            {!showFullJD && scanResult.jobDescription.length > 200 && '…'}
          </span>
          {' '}
          <button
            onClick={() => setShowFullJD((v) => !v)}
            className="text-indigo-500 hover:text-indigo-700 underline"
          >
            {showFullJD ? 'show less' : 'show more'}
          </button>
        </div>
      )}

      {/* Resume picker */}
      {profiles.length > 1 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Select resume</p>
          <div className="flex flex-col gap-1">
            {profiles.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedProfileId === p.id
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-200'
                }`}
              >
                <input
                  type="radio"
                  name="profile"
                  value={p.id}
                  checked={selectedProfileId === p.id}
                  onChange={() => onSelectProfile(p.id)}
                  className="accent-indigo-500"
                />
                <span className="text-xs text-gray-700">{p.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {profiles.length === 1 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          <span className="text-xs text-gray-600">Using: {profiles[0].label}</span>
        </div>
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
            Rescan
          </button>
          <button
            onClick={onHighlight}
            disabled={scanResult.fieldCount === 0}
            className="flex-1 py-2 text-xs font-medium border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-600 rounded-lg transition-colors disabled:opacity-40"
          >
            Highlight fields
          </button>
        </div>

        {!aiAnswers && hasProfile && hasJD && (
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
          disabled={isFilling || !canFill}
          className="w-full py-2.5 text-sm font-semibold bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFilling
            ? 'Filling…'
            : aiAnswers
            ? 'Fill with AI answers →'
            : 'Auto-Fill Application'}
        </button>

        {scanResult.isJobListingPage && (
          <p className="text-xs text-amber-600 text-center">
            Click Apply on the job page, then open Resumeow to fill the form.
          </p>
        )}

        {!hasProfile && (
          <p className="text-xs text-amber-600 text-center">
            Complete your resume profile first at{' '}
            <button
              onClick={() => chrome.tabs.create({ url: 'https://resumeow.app' })}
              className="underline"
            >
              resumeow.app
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
