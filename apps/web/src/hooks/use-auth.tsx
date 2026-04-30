'use client';
import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { User, LoginInput, RegisterInput, BrokerWithProfile } from '@saudi-re/shared';
import { api } from '@/lib/api';

type AuthContextType = {
  user: User | BrokerWithProfile | null;
  loading: boolean;
  login: (data: LoginInput) => Promise<boolean>;
  register: (data: RegisterInput) => Promise<boolean>;
  logout: () => void;
  refreshUser: (force?: boolean) => Promise<void>;
  updateCredits: (newBalance: number) => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | BrokerWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const locale = useLocale();
  const lastSyncRef = useRef<number>(0);
  const SYNC_COOLDOWN = 30000; // 30 seconds

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
    
    const handleAuthLogout = () => {
      setUser(null);
      localStorage.removeItem('accessToken');
      router.push(`/${locale}/auth/login`);
    };

    window.addEventListener('auth-logout', handleAuthLogout);
    return () => window.removeEventListener('auth-logout', handleAuthLogout);
  }, [locale, router]);

  const login = async (credentials: LoginInput) => {
    const result = await api.login(credentials);
    if (result.success && result.data) {
      localStorage.setItem('accessToken', result.data.accessToken);
      setUser(result.data.user);
      return true;
    }
    return false;
  };

  const register = async (data: RegisterInput) => {
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

  const refreshUser = async (force: boolean = false) => {
    const now = Date.now();
    
    // Skip if synced recently, UNLESS forced (e.g. after a transaction)
    if (!force && (now - lastSyncRef.current < SYNC_COOLDOWN)) {
      return; 
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      const result = await api.getMe();
      if (result.success && result.data) {
        setUser(result.data.user);
        lastSyncRef.current = now;
      }
    }
  };

  const updateCredits = (newBalance: number) => {
    setUser(prev => prev ? { ...prev, creditsBalance: newBalance } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, updateCredits, isAuthenticated: !!user }}>
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
