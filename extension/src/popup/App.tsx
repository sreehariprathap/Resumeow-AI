import React, { useEffect, useState } from 'react';
import type {
  ScanResult,
  FillResult,
  AIAnswers,
  UserProfile,
  ResumeProfile,
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
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [fillResult, setFillResult] = useState<FillResult | null>(null);
  const [aiAnswers, setAiAnswers] = useState<AIAnswers | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Init: check auth, load profiles, scan page
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

        // Load profiles in parallel
        const [profileRes, resumeRes] = await Promise.allSettled([
          sendToBackground<{ profile: UserProfile | null }>({ type: 'GET_PROFILE' }),
          sendToBackground<{ resumeProfile: ResumeProfile | null }>({ type: 'GET_RESUME_PROFILE' }),
        ]);

        if (profileRes.status === 'fulfilled') setUserProfile(profileRes.value.profile);
        if (resumeRes.status === 'fulfilled') setResumeProfile(resumeRes.value.resumeProfile);

        // Auto-scan current tab
        await scanCurrentPage();
      } catch (e) {
        setAuthState('signed-out');
      }
    })();
  }, []);

  const scanCurrentPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const res = await sendToContentScript<ScanResult>(tab.id, { type: 'SCAN_PAGE' });
      setScanResult(res);
    } catch {
      // Content script not injected on this page — not a job page
      setScanResult(null);
    }
  };

  const handleGenerateAI = async () => {
    if (!scanResult || !resumeProfile) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await sendToBackground<{ answers: AIAnswers }>({
        type: 'GENERATE_AI_ANSWERS',
        jobDescription: scanResult.jobDescription,
        resumeProfile,
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
    } catch (e) {
      setError('Could not highlight fields on this page');
    }
  };

  const handleFill = async () => {
    if (!resumeProfile) return;
    setIsFilling(true);
    setError(null);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab');
      const result = await sendToContentScript<FillResult>(tab.id, {
        type: 'FILL_FORMS',
        data: { profile: resumeProfile, aiAnswers: aiAnswers ?? undefined },
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

  const isOnJobPage = scanResult && scanResult.site !== 'unknown' && scanResult.fieldCount > 0;

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
          resumeProfile={resumeProfile}
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
