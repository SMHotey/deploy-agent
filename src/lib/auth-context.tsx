'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  getToken: () => string | null;
  requireAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getToken = useCallback(() => {
    return localStorage.getItem('accessToken');
  }, []);

  const fetchUser = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return true;
      }
    } catch {
      // Token invalid
    }
    return false;
  }, []);

  useEffect(() => {
    const token = getToken();
    const disableAuth = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' || process.env.DISABLE_AUTH === 'true';
    
    if (disableAuth) {
      // When auth is disabled, create a mock user
      setUser({ id: 1, email: 'test@example.com', name: 'Test User' });
      setIsLoading(false);
      return;
    }
    
    if (token) {
      fetchUser(token).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = useCallback((token: string) => {
    localStorage.setItem('accessToken', token);
    fetchUser(token);
  }, [fetchUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    setUser(null);
    router.push('/');
  }, [router]);

  const requireAuth = useCallback((): boolean => {
    const disableAuth = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' || process.env.DISABLE_AUTH === 'true';
    if (disableAuth) {
      return true; // Always allow access when auth is disabled
    }
    
    const token = getToken();
    if (!token) {
      router.push('/');
      return false;
    }
    return true;
  }, [getToken, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        getToken,
        requireAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
