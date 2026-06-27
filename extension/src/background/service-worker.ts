import { auth, db } from '../shared/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { generateAIAnswers } from '../shared/gemini';
import type { ResumeProfile, UserProfile } from '../shared/types';

let currentUser: { uid: string; email: string } | null = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user ? { uid: user.uid, email: user.email ?? '' } : null;
  chrome.action.setBadgeText({ text: user ? '' : '!' });
  chrome.action.setBadgeBackgroundColor({ color: user ? '#6366f1' : '#ef4444' });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_AUTH_STATE') {
    sendResponse({ user: currentUser });
    return false;
  }

  if (msg.type === 'GET_PROFILE') {
    if (!currentUser) {
      sendResponse({ error: 'Not signed in' });
      return false;
    }
    getDoc(doc(db, 'userProfiles', currentUser.uid))
      .then((snap) => sendResponse({ profile: (snap.data() as UserProfile) ?? null }))
      .catch((err: Error) => sendResponse({ error: err.message }));
    return true;
  }

  if (msg.type === 'GET_RESUME_PROFILE') {
    if (!currentUser) {
      sendResponse({ error: 'Not signed in' });
      return false;
    }
    getDoc(doc(db, 'users', currentUser.uid, 'resumeProfile', 'data'))
      .then((snap) => sendResponse({ resumeProfile: (snap.data() as ResumeProfile) ?? null }))
      .catch((err: Error) => sendResponse({ error: err.message }));
    return true;
  }

  if (msg.type === 'GENERATE_AI_ANSWERS') {
    if (!currentUser) {
      sendResponse({ error: 'Not signed in' });
      return false;
    }
    // Read stored Gemini API key from chrome.storage, fall back to default
    chrome.storage.local.get('geminiApiKey', (items) => {
      const apiKey = items.geminiApiKey as string | undefined;
      generateAIAnswers(msg.jobDescription, msg.resumeProfile as ResumeProfile, apiKey)
        .then((answers) => sendResponse({ answers }))
        .catch((err: Error) => sendResponse({ error: err.message }));
    });
    return true;
  }

  return false;
});

// Keep service worker alive during long async operations
chrome.runtime.onInstalled.addListener(() => {
  console.log('Resumeow extension installed');
});
