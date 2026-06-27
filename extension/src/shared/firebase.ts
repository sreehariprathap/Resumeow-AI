import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBiFmKo5WAGw7sNeEyVPM6mdwOFj5nQOWA',
  authDomain: 'resumeow-3fd09.firebaseapp.com',
  projectId: 'resumeow-3fd09',
  storageBucket: 'resumeow-3fd09.firebasestorage.app',
  messagingSenderId: '907492684832',
  appId: '1:907492684832:web:60313f616ceabce26d7845',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
