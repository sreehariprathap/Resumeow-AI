import React, { useEffect, useState } from 'react';
import type {
  ScanResult,
  FillResult,
  AIAnswers,
  UserProfile,
  ResumeProfile,
  ResumeProfileOption,
} from '../shared/types';
import { SignInView } from './components/SignInView';
import { JobDetectedView } from './components/JobDetectedView';
import { FillStatusView } from './components/FillStatusView';
import { NotOnJobPageView } from './components/NotOnJobPageView';

type AuthState = 'loading' | 'signed-in' | 'signed-out';

function sendToBackground<T>(msg: object): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (res?.error) return reject(new Error(res.error));
      resolve(res);
    });
  });
}

async function sendToContentScript<T>(tabId: number, msg: object): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (res) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (res?.error) return reject(new Error(res.error));
      resolve(res);
    });
  });
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [profiles, setProfiles] = useState<ResumeProfileOption[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('default');
  const [fillResult, setFillResult] = useState<FillResult | null>(null);
  const [aiAnswers, setAiAnswers] = useState<AIAnswers | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const authRes = await sendToBackground<{ user: { uid: string; email: string } | null }>(
          { type: 'GET_AUTH_STATE' }
        );

        if (!authRes.user) {
          setAuthState('signed-out');
          return;
        }

        setAuthState('signed-in');

        // Load user profile and scan the page in parallel
        const [profileRes] = await Promise.allSettled([
          sendToBackground<{ profile: UserProfile | null }>({ type: 'GET_PROFILE' }),
        ]);

        if (profileRes.status === 'fulfilled') setUserProfile(profileRes.value.profile);

        // Auto-scan the active tab
        await scanCurrentPage();

        // Load resume profiles (after scan so we don't block the UI)
        try {
          const profilesRes = await sendToBackground<{ profiles: ResumeProfileOption[] }>(
            { type: 'GET_RESUME_PROFILES' }
          );
          if (profilesRes.profiles?.length) {
            setProfiles(profilesRes.profiles);
            setSelectedProfileId(profilesRes.profiles[0].id);
          }
        } catch {
          // profiles unavailable — fill button will be disabled
        }
      } catch {
        setAuthState('signed-out');
      }
    })();
  }, []);

  const scanCurrentPage = async () => {
    setIsScanning(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) { setIsScanning(false); return; }
      const res = await sendToContentScript<ScanResult>(tab.id, { type: 'SCAN_PAGE_ASYNC' });
      setScanResult(res);
    } catch {
      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  const selectedProfile: ResumeProfile | null =
    profiles.find((p) => p.id === selectedProfileId)?.profile ?? null;

  const handleGenerateAI = async () => {
    if (!scanResult || !selectedProfile) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await sendToBackground<{ answers: AIAnswers }>({
        type: 'GENERATE_AI_ANSWERS',
        jobDescription: scanResult.jobDescription,
        resumeProfile: selectedProfile,
      });
      setAiAnswers(res.answers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate AI answers');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleHighlight = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      await sendToContentScript(tab.id, { type: 'HIGHLIGHT_FIELDS' });
    } catch {
      setError('Could not highlight fields on this page');
    }
  };

  const handleFill = async () => {
    if (!selectedProfile) return;
    setIsFilling(true);
    setError(null);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab');

      // Use Workday-specific fill when on a Workday application page
      const isWorkday = scanResult?.site === 'workday' && scanResult.isApplicationPage;
      const msgType = isWorkday ? 'FILL_FORMS_WORKDAY' : 'FILL_FORMS';

      const result = await sendToContentScript<FillResult>(tab.id, {
        type: msgType,
        data: { profile: selectedProfile, aiAnswers: aiAnswers ?? undefined },
      });
      setFillResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fill failed');
    } finally {
      setIsFilling(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (authState === 'loading') {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === 'signed-out') {
    return <SignInView />;
  }

  if (fillResult) {
    return (
      <FillStatusView
        result={fillResult}
        onReset={() => {
          setFillResult(null);
          setAiAnswers(null);
          scanCurrentPage();
        }}
      />
    );
  }

  // Show job view when: on a known site, or there's a meaningful JD, or there are form fields
  const isOnJobPage =
    scanResult &&
    (scanResult.site !== 'unknown' ||
      scanResult.jobDescription.length > 100 ||
      scanResult.fieldCount > 0);

  if (isScanning) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] gap-3">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Scanning page...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {isOnJobPage ? (
        <JobDetectedView
          scanResult={scanResult}
          userProfile={userProfile}
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onSelectProfile={setSelectedProfileId}
          aiAnswers={aiAnswers}
          isGenerating={isGenerating}
          isFilling={isFilling}
          onScan={scanCurrentPage}
          onGenerateAI={handleGenerateAI}
          onHighlight={handleHighlight}
          onFill={handleFill}
          onFillResult={setFillResult}
        />
      ) : (
        <NotOnJobPageView userProfile={userProfile} />
      )}
    </div>
  );
}
