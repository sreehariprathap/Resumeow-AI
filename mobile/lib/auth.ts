import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import { initUserProfile } from './tokens';

export type { User };

export const signUp = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  await initUserProfile(credential.user.uid, email, displayName);
  return credential.user;
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await initUserProfile(
    credential.user.uid,
    credential.user.email ?? email,
    credential.user.displayName ?? email.split('@')[0]
  );
  return credential.user;
};

export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

export const subscribeToAuthChanges = (
  callback: (user: User | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};
