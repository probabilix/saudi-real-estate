'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type AuthContextType = {
  user: any | null;
  loading: boolean;
  login: (data: any) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const result = await api.getMe();
        if (result.success && result.data) {
          setUser(result.data.user);
        } else {
          localStorage.removeItem('accessToken');
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = async (credentials: any) => {
    const result = await api.login(credentials);
    if (result.success && result.data) {
      localStorage.setItem('accessToken', result.data.accessToken);
      setUser(result.data.user);
      return true;
    }
    return false;
  };

  const register = async (data: any) => {
    const result = await api.register(data);
    if (result.success && result.data) {
      if (result.data.accessToken && result.data.user) {
        localStorage.setItem('accessToken', result.data.accessToken);
        setUser(result.data.user);
      }
      return true;
    }
    return false;
  };

  const logout = async () => {
    await api.logout();
    localStorage.removeItem('accessToken');
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
