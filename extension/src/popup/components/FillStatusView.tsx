import React from 'react';
import type { FillResult } from '../../shared/types';

interface Props {
  result: FillResult;
  onReset: () => void;
}

export function FillStatusView({ result, onReset }: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[200px]">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold text-gray-900">
          Filled {result.filled} field{result.filled !== 1 ? 's' : ''}
        </p>
        {result.skipped.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {result.skipped.length} skipped
          </p>
        )}
      </div>

      {result.skipped.length > 0 && (
        <div className="w-full bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Skipped fields:</p>
          <ul className="text-xs text-gray-400 space-y-0.5">
            {result.skipped.slice(0, 5).map((s, i) => (
              <li key={i} className="truncate">• {s}</li>
            ))}
            {result.skipped.length > 5 && (
              <li className="text-gray-300">+{result.skipped.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      <button
        onClick={onReset}
        className="text-sm text-indigo-500 hover:text-indigo-700 font-medium"
      >
        Scan again
      </button>
    </div>
  );
}
