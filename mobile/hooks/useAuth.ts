import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { createElement } from 'react';
import { subscribeToAuthChanges, type User } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return createElement(AuthContext.Provider, { value: { user, isLoading } }, children);
}

export const useAuth = () => useContext(AuthContext);
