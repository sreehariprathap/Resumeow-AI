import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '../../shared/firebase';

export function SignInView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*?\)\.?/, '').trim());
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        setError(chrome.runtime.lastError?.message ?? 'Google sign-in failed');
        return;
      }
      setIsLoading(true);
      try {
        const credential = GoogleAuthProvider.credential(null, token);
        await signInWithCredential(auth, credential);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Google sign-in failed');
      } finally {
        setIsLoading(false);
      }
    });
  };

  return (
    <div className="flex flex-col items-center p-6 gap-5 min-h-[280px]">
      <div className="flex flex-col items-center gap-1">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
          R
        </div>
        <h1 className="text-lg font-bold text-gray-900">Resumeow</h1>
        <p className="text-xs text-gray-500">AI-powered job application autofill</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
        />

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          {isLoading ? '...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div className="w-full flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          <span className="font-bold text-base">G</span>
          Continue with Google
        </button>
      </div>

      <button
        onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setError(null); }}
        className="text-xs text-indigo-500 hover:underline"
      >
        {mode === 'signin' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
