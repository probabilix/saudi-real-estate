'use client';
import { useState, useEffect } from 'react';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CrmLoginPage() {
  const { login } = useCrmAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);

  useEffect(() => {
    async function fetchLogo() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const res = await fetch(`${apiBase}/system/settings`);
        const json = await res.json();
        if (json.success && json.data) {
          setLogoUrl(json.data.logo_url || null);
        }
      } catch (e) {
        console.error('Failed to fetch dynamic logo', e);
      } finally {
        setIsLoadingLogo(false);
      }
    }
    fetchLogo();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) setError(result.error || 'Login failed');
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — dark brand panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between bg-sidebar-bg p-12 relative overflow-hidden shrink-0">
        {/* Geometric background accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            {isLoadingLogo ? (
              <div className="w-10 h-10 bg-white/5 rounded-2xl animate-pulse" />
            ) : logoUrl ? (
              <div className="h-10 w-auto shrink-0 flex items-center justify-start overflow-hidden bg-white rounded-lg p-1 animate-in fade-in duration-300">
                <img src={logoUrl} alt="Logo" className="max-h-full w-auto object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/30">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="text-white font-bold text-lg">Tamleeq</div>
              <div className="text-primary-400 text-xs font-semibold tracking-widest uppercase">CRM Workspace</div>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div className="w-16 h-1 bg-gold rounded-full" />
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Your leads,<br />
            <span className="text-primary-400">your pipeline.</span>
          </h2>
          <p className="text-surface-400 text-base leading-relaxed max-w-sm">
            Manage website inquiries, ad campaign leads, and your full sales pipeline from one powerful workspace.
          </p>

          {/* Stats row */}
          <div className="flex gap-8 pt-4">
            {[
              { val: '2', label: 'Lead Modules' },
              { val: '8', label: 'Pipeline Stages' },
              { val: '∞', label: 'Team Scalable' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-white">{s.val}</div>
                <div className="text-xs text-surface-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-xs text-surface-600">
          © {new Date().getFullYear()} Tamleeq Platform
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-canvas">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            {isLoadingLogo ? (
              <div className="w-9 h-9 bg-gray-100 rounded-xl animate-pulse" />
            ) : logoUrl ? (
              <div className="h-9 w-auto shrink-0 flex items-center justify-start overflow-hidden bg-white rounded-lg p-1 animate-in fade-in duration-300">
                <img src={logoUrl} alt="Logo" className="max-h-full w-auto object-contain" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
                <Building2 className="w-4.5 h-4.5 text-white" />
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-surface-800">Tamleeq CRM</div>
              <div className="text-[10px] text-surface-400 font-semibold tracking-widest uppercase">Workspace</div>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-surface-900 mb-1.5">Welcome back</h1>
            <p className="text-surface-500 text-sm">Sign in to access your CRM workspace</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5 text-sm text-red-600"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="crm-label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="agent@company.com"
                  className="crm-input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="crm-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="crm-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-2xl justify-center mt-2 shadow-lg shadow-primary-600/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Sign In to CRM <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-surface-400">
            Use your platform account credentials. Contact admin if access is restricted.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
