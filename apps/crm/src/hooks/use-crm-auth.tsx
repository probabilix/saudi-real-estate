'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { crmApi } from '@/lib/api';

export type CrmUserRole = 'ADMIN' | 'AGENT' | 'SOLO_BROKER' | 'SALES_AGENT';

export interface CrmUser {
  id: string;
  name: string;
  email: string;
  role: CrmUserRole;
}

interface CrmAuthContextType {
  user: CrmUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const CrmAuthContext = createContext<CrmAuthContextType | undefined>(undefined);

const ALLOWED_ROLES: CrmUserRole[] = ['ADMIN', 'AGENT', 'SOLO_BROKER', 'SALES_AGENT'];

export function CrmAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CrmUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function init() {
      const token = localStorage.getItem('crmToken');
      if (token) {
        const result = await crmApi.getMe();
        if (result.success && result.data) {
          const u = result.data.user;
          if (ALLOWED_ROLES.includes(u.role as CrmUserRole)) {
            setUser(u as CrmUser);
          } else {
            localStorage.removeItem('crmToken');
          }
        } else {
          localStorage.removeItem('crmToken');
        }
      }
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    const isLoginPage = pathname === '/login';
    if (!user && !isLoginPage) router.replace('/login');
    else if (user && isLoginPage) router.replace('/');
  }, [loading, user, pathname, router]);

  const login = async (email: string, password: string) => {
    const result = await crmApi.login(email, password);
    if (result.success && result.data) {
      const u = result.data.user;
      if (!ALLOWED_ROLES.includes(u.role as CrmUserRole)) {
        return { success: false, error: 'Access denied. CRM is for agents and admins only.' };
      }
      localStorage.setItem('crmToken', result.data.accessToken);
      setUser(u as CrmUser);
      return { success: true };
    }
    return { success: false, error: result.message || 'Invalid credentials' };
  };

  const logout = () => {
    crmApi.logout();
    localStorage.removeItem('crmToken');
    setUser(null);
    router.replace('/login');
  };

  return (
    <CrmAuthContext.Provider value={{
      user, loading, login, logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
    }}>
      {children}
    </CrmAuthContext.Provider>
  );
}

export function useCrmAuth() {
  const ctx = useContext(CrmAuthContext);
  if (!ctx) throw new Error('useCrmAuth must be within CrmAuthProvider');
  return ctx;
}
