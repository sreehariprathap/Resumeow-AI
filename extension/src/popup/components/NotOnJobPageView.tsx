import React from 'react';
import type { UserProfile } from '../../shared/types';

interface Props {
  userProfile: UserProfile | null;
}

const SUPPORTED_SITES = [
  { name: 'LinkedIn', host: 'linkedin.com/jobs' },
  { name: 'Indeed', host: 'indeed.com' },
  { name: 'Greenhouse', host: '*.greenhouse.io' },
  { name: 'Lever', host: '*.lever.co' },
  { name: 'Ashby', host: '*.ashby.io' },
  { name: 'Workday', host: '*.workday.com' },
  { name: 'Glassdoor', host: 'glassdoor.com' },
  { name: 'SmartRecruiters', host: 'smartrecruiters.com' },
];

export function NotOnJobPageView({ userProfile }: Props) {
  return (
    <div className="flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
            R
          </div>
          <span className="font-semibold text-gray-900 text-sm">Resumeow</span>
        </div>
        {userProfile && (
          <span className="text-xs text-gray-500 truncate max-w-[140px]">
            {userProfile.displayName} · {userProfile.tokensRemaining} tokens
          </span>
        )}
      </div>

      {/* Not on job page notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
        You're not on a supported job page. Navigate to a job listing to use autofill.
      </div>

      {/* Supported sites */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Supported sites</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SUPPORTED_SITES.map((site) => (
            <div
              key={site.name}
              className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <span className="text-xs text-gray-600 truncate">{site.name}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => chrome.tabs.create({ url: 'https://resumeow.app' })}
        className="w-full py-2 text-xs font-medium border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-600 rounded-lg transition-colors"
      >
        Open Resumeow
      </button>
    </div>
  );
}
