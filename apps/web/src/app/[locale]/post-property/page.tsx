'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ChevronLeft, ShieldCheck, ShieldAlert, ArrowRight, Loader2, Sparkles, UserCheck, Clock, ArrowLeft, PlusCircle, Building } from 'lucide-react';
import Link from 'next/link';
import { VerificationGuard } from '@/components/auth/VerificationGuard';
import { ListingForm } from '@/components/listings/ListingForm';
import { hasManagementAccess } from '@/lib/config';

export default function PostPropertyPage({ params: { locale } }: { params: { locale: string } }) {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  // Form states for broker application
  const [licenseNumber, setLicenseNumber] = useState('');
  const [bio, setBio] = useState('');
  const [nationality, setNationality] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showFormOverride, setShowFormOverride] = useState(false);

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const fromAdmin = searchParams?.get('from') === 'admin';
  const fromCrm = searchParams?.get('from') === 'crm';

  // Real-Time Status Sync: Refresh user verification status on mount
  useEffect(() => {
    if (user) {
      refreshUser(true);
    }
  }, [user?.id]);

  // Pre-fill form values from user profile when user state is loaded/refreshed
  useEffect(() => {
    if (user) {
      if (user.regaLicence) setLicenseNumber(user.regaLicence);
      if (user.nationality) setNationality(user.nationality);
      if (user.city) setCity(user.city);
      
      const brokerUser = user as any;
      if (brokerUser.profile?.bioEn) {
        setBio(brokerUser.profile.bioEn);
      } else if (brokerUser.profile?.bioAr) {
        setBio(brokerUser.profile.bioAr);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user && !fromAdmin && !fromCrm) {
      router.push(`/${locale}/auth/login?returnTo=${encodeURIComponent(`/${locale}/post-property`)}`);
    }
  }, [user, loading, router, locale, fromAdmin, fromCrm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#064e4b]" />
      </div>
    );
  }

  if (!user) {
    if (fromAdmin || fromCrm) {
      return (
        <VerificationGuard>
          <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-[#064e4b]" />
          </div>
        </VerificationGuard>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#064e4b]" />
      </div>
    );
  }

  const isAllowedToPost = 
    (user.role === 'ADMIN' || user.role === 'SOLO_BROKER' || user.regaVerified === true || hasManagementAccess(user)) && 
    user.role !== 'BUYER' && 
    user.verificationStatus !== 'REJECTED' && 
    user.verificationStatus !== 'PENDING';
  const isPending = user.verificationStatus === 'PENDING';

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!licenseNumber || !nationality || !city) {
      setError('Please fill in all required fields.');
      setSubmitting(false);
      return;
    }

    try {
      // 1. Update Profile (City, Nationality, Bio)
      const profileRes = await api.updateProfile({
        city,
        nationality,
        bioEn: bio,
        bioAr: bio
      });

      if (!profileRes.success) {
        setError(profileRes.error || 'Failed to update profile details.');
        setSubmitting(false);
        return;
      }

      // 2. Submit professional verification (REGA Falcon license)
      const verifyRes = await api.verifyProfessional(licenseNumber, 'sell');
      if (verifyRes.success) {
        setSuccess(true);
        setShowFormOverride(false); // reset override state on successful submission
        await refreshUser(true); // reload user state
      } else {
        setError(verifyRes.error || 'Failed to submit verification request.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isAllowedToPost) {
    if (fromAdmin || fromCrm) {
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || (isLocal ? 'http://localhost:3002' : 'https://saudi-real-estate-admin.vercel.app');
      const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || (isLocal ? 'http://localhost:3003' : 'https://saudi-real-estate-crm.vercel.app');
      const cancelUrl = fromAdmin ? `${adminUrl}/listings` : `${crmUrl}/my-listings`;

      return (
        <VerificationGuard>
          <div className="container mx-auto px-4 py-12 max-w-5xl">
            <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <h1 className="text-3xl font-black text-slate-900 mb-1 uppercase tracking-tight">
                  Create New Listing
                </h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  Marketplace Inventory Integration ({fromAdmin ? 'Admin Panel' : 'CRM Portal'})
                </p>
              </div>
              <a
                href={cancelUrl}
                className="inline-flex items-center gap-1.5 text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all"
              >
                Cancel
              </a>
            </div>
            <ListingForm isStandalone={true} />
          </div>
        </VerificationGuard>
      );
    }

    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || (isLocal ? 'http://localhost:3003' : 'https://saudi-real-estate-crm.vercel.app');

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 md:p-10 text-center space-y-8 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-[#064e4b]/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute left-0 bottom-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#064e4b] flex items-center justify-center mx-auto shadow-inner relative z-10">
            <Building className="w-8 h-8" />
          </div>

          <div className="space-y-3 relative z-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Broker CRM Portal</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] font-bold">Authorized Professional Area</p>
            <p className="text-slate-600 text-sm leading-relaxed max-w-sm mx-auto pt-2">
              Property listing creation and asset management are strictly centralized inside the official **Broker CRM**. Listing on the public portal is disabled to ensure unified data synchronization.
            </p>
          </div>

          <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-5 text-xs text-[#064e4b] text-left space-y-3 relative z-10">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Unified Inventory Sync</p>
                <p className="text-slate-500 leading-normal">Your CRM listings automatically sync and stream to the public marketplace in real-time.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Lead Pipeline Integration</p>
                <p className="text-slate-500 leading-normal">Track tenant applications, buy/rent offers, and client interactions in one centralized dashboard.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 relative z-10">
            <Link
              href={`/${locale}`}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-4 px-6 rounded-2xl font-bold transition-all shadow-sm"
            >
              Back to Marketplace
            </Link>
            <a
              href={crmUrl}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center bg-[#064e4b] hover:bg-[#043a37] text-white py-4 px-6 rounded-2xl font-bold gap-2 shadow-lg shadow-[#064e4b]/10 hover:shadow-xl transition-all group"
            >
              <span>Go to Broker CRM</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isPending || success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="max-w-md w-full space-y-6">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-[#064e4b] transition-all group text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Marketplace
          </Link>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Application Under Review</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Your application to become a certified Broker is currently pending manual admin verification. 
                Our team will inspect your REGA Falcon license credentials.
              </p>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 text-left space-y-1">
              <p className="font-bold">Next Steps:</p>
              <p className="leading-relaxed">1. We will cross-reference your license with the Saudi Real Estate Authority.</p>
              <p className="leading-relaxed">2. An admin may contact you via WhatsApp or Email if any clarifications are needed.</p>
              <p className="leading-relaxed">3. You will receive an automated welcome email with a login link once approved.</p>
            </div>

            <Link
              href={`/${locale}`}
              className="w-full inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white py-4 px-6 rounded-2xl font-bold transition-all"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isRejected = user.verificationStatus === 'REJECTED';

  if (isRejected && !showFormOverride) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="max-w-xl w-full space-y-6">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-[#064e4b] transition-all group text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Marketplace
          </Link>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 md:p-10 text-center space-y-8 relative overflow-hidden">
            {/* Decorative background gradients */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute left-0 bottom-0 w-32 h-32 bg-[#064e4b]/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner relative z-10">
              <ShieldAlert className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-3 relative z-10">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Application Rejected</h1>
              <p className="text-[10px] text-rose-500 font-black uppercase tracking-[0.3em] font-bold">Broker Verification Update</p>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto pt-2">
                We regret to inform you that your application to become a certified Broker has been rejected by our compliance team. 
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-xs text-slate-700 text-left space-y-3 relative z-10">
              <p className="font-bold text-slate-900 text-sm">Common Reasons for Rejection:</p>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-500">
                <li>The REGA Falcon license number provided could not be verified.</li>
                <li>Your name on the platform does not match the official registration database.</li>
                <li>The professional bio/profile details were incomplete or invalid.</li>
              </ul>
              <p className="text-slate-400 text-[10px] pt-1 italic">
                Please ensure you have an active Falcon license from the Saudi Real Estate General Authority (REGA) before re-applying.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 relative z-10">
              <Link
                href={`/${locale}`}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-4 px-6 rounded-2xl font-bold transition-all shadow-sm"
              >
                Back to Home
              </Link>
              <button
                onClick={() => setShowFormOverride(true)}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center bg-[#064e4b] hover:bg-[#043a37] text-white py-4 px-6 rounded-2xl font-bold gap-2 shadow-lg shadow-[#064e4b]/10 hover:shadow-xl transition-all group"
              >
                <span>Re-apply & Correct Details</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 flex items-center justify-center animate-in fade-in duration-300">
      <div className="max-w-xl w-full space-y-6">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-[#064e4b] transition-all group text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Marketplace
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 md:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-[#064e4b]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Become a Certified Broker</h1>
              <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
                Unlock access to CRM listing management, qualified customer leads pipelines, and premium advertising economics.
              </p>
            </div>
          </div>

          {isRejected && (
            <div className="p-4 bg-amber-50/50 border border-amber-100/50 text-amber-800 text-xs font-bold rounded-2xl flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-extrabold text-amber-950">Revision Required</p>
                <p className="font-normal text-amber-800/90 mt-0.5">Your previous application was rejected. Please ensure your REGA license and profile details are accurate before resubmitting.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Application Form */}
          <form onSubmit={handleSubmitApplication} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">REGA Falcon License *</label>
              <input
                type="text"
                placeholder="e.g. 110000XXXX"
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white focus:ring-1 focus:ring-[#064e4b] transition-all rounded-xl py-3 px-4 text-sm font-semibold outline-none text-slate-900"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Nationality *</label>
                <input
                  type="text"
                  placeholder="e.g. Saudi Arabia"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white focus:ring-1 focus:ring-[#064e4b] transition-all rounded-xl py-3 px-4 text-sm font-semibold outline-none text-slate-900"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">City *</label>
                <input
                  type="text"
                  placeholder="e.g. Riyadh"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white focus:ring-1 focus:ring-[#064e4b] transition-all rounded-xl py-3 px-4 text-sm font-semibold outline-none text-slate-900"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">Professional Bio (Optional)</label>
              <textarea
                rows={3}
                placeholder="Tell us about your experience, area specialties, or brokerage company..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white focus:ring-1 focus:ring-[#064e4b] transition-all rounded-xl py-3 px-4 text-sm font-semibold outline-none text-slate-900 resize-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#064e4b] hover:bg-[#043a37] text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#064e4b]/10 hover:shadow-xl transition-all"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </form>

          <div className="border-t border-slate-100 pt-6 flex items-center justify-between text-[11px] text-slate-400">
            <span>By submitting, you agree to REGA regulatory audits.</span>
            <Link href={`/${locale}`} className="hover:underline font-bold text-slate-600">Cancel</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
