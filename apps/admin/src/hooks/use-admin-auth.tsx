'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { adminApi } from '@/lib/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function init() {
      const token = localStorage.getItem('adminToken');
      if (token) {
        const result = await adminApi.getMe();
        if (result.success && result.data) {
          const u = result.data.user;
          if (u.role === 'ADMIN') {
            setUser(u as AdminUser);
          } else {
            localStorage.removeItem('adminToken');
          }
        } else {
          localStorage.removeItem('adminToken');
        }
      }
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route guard — only redirect AFTER loading is complete
  useEffect(() => {
    if (loading) return;
    const isLoginPage = pathname === '/login';
    if (!user && !isLoginPage) {
      router.replace('/login');
    } else if (user && isLoginPage) {
      router.replace('/');
    }
  }, [loading, user, pathname, router]);

  const login = async (email: string, password: string) => {
    const result = await adminApi.login(email, password);
    if (result.success && result.data) {
      const u = result.data.user;
      if (u.role !== 'ADMIN') {
        return { success: false, error: 'Access denied. Admin accounts only.' };
      }
      localStorage.setItem('adminToken', result.data.accessToken);
      setUser(u as AdminUser);
      return { success: true };
    }
    return { success: false, error: result.message || 'Invalid credentials' };
  };

  const logout = async () => {
    await adminApi.logout();
    localStorage.removeItem('adminToken');
    setUser(null);
    router.replace('/login');
  };

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be within AdminAuthProvider');
  return ctx;
}
