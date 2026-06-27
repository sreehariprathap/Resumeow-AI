import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import type { ProfileCompletionStatus } from '../lib/profileCompletion';

interface ProfileGateBannerProps {
  status: ProfileCompletionStatus;
  featureName: string;
}

export function ProfileGateBanner({ status, featureName }: ProfileGateBannerProps) {
  const navigate = useNavigate();

  if (status.hasMinimumData) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-5 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Complete your profile to use {featureName}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            {featureName} needs your resume data (experience, education, skills) to work.
            Your profile is {status.completionPercent}% complete.
          </p>

          <div className="mt-3 h-2 bg-amber-100 dark:bg-amber-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${status.completionPercent}%` }}
            />
          </div>

          {status.missingFields.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Missing: {status.missingFields.slice(0, 3).join(', ')}
              {status.missingFields.length > 3 && ` +${status.missingFields.length - 3} more`}
            </p>
          )}

          <button
            onClick={() => navigate('/?onboarding=true')}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300 hover:underline"
          >
            Complete your profile <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
