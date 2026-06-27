import React from 'react';

export function SignInView() {
  const openWebApp = () => {
    chrome.tabs.create({ url: 'https://resumeow.app' });
    window.close();
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[220px]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          R
        </div>
        <h1 className="text-xl font-bold text-gray-900">Resumeow</h1>
        <p className="text-sm text-gray-500 text-center">AI-powered job application autofill</p>
      </div>

      <div className="w-full flex flex-col gap-3">
        <button
          onClick={openWebApp}
          className="w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          Sign in to Resumeow
        </button>
        <p className="text-xs text-gray-400 text-center">
          Sign in at resumeow.app, then return here
        </p>
      </div>
    </div>
  );
}
