'use client';
import { AdminAuthProvider, useAdminAuth } from '@/hooks/use-admin-auth';
import { AdminSidebar } from '@/components/AdminSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AuthGuard>
        <div className="flex h-screen overflow-hidden bg-canvas">
          <AdminSidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </AuthGuard>
    </AdminAuthProvider>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-sidebar-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sidebar-text text-sm font-medium animate-pulse">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, return null (redirect is handled in hook)
  if (!user) return null;

  return <>{children}</>;
}
