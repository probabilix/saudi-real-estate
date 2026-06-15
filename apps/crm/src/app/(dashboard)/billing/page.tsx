'use client';
import { useState, useEffect } from 'react';
import { CrmTopBar } from '@/components/CrmSidebar';
import { crmApi, CrmListing } from '@/lib/api';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import {
  Wallet, CreditCard, Award, Flame, CheckCircle,
  Loader2, Plus, Sparkles, UserCheck, HelpCircle,
  Info, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import clsx from 'clsx';

const PACKAGES = [
  { key: 'starter', name: 'Starter Package', credits: 1000, price: 799, popular: false, desc: 'Ideal for independent agents testing out properties' },
  { key: 'advanced', name: 'Advanced Package', credits: 2500, price: 1499, popular: true, desc: 'Best value for active local brokers' },
  { key: 'professional', name: 'Professional Package', credits: 5000, price: 2999, popular: false, desc: 'Optimized for growing brokerage agencies' },
  { key: 'elite', name: 'Elite Package', credits: 10000, price: 4999, popular: false, desc: 'Maximum discount for listing agencies & firms' },
];

export default function BillingPage() {
  const { user } = useCrmAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [listings, setListings] = useState<CrmListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);

  // Checkout Modal State
  const [selectedPkg, setSelectedPkg] = useState<typeof PACKAGES[0] | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Upgrade Listing Form State
  const [selectedListingId, setSelectedListingId] = useState('');
  const [selectedUpgradeDays, setSelectedUpgradeDays] = useState<number>(7);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchListings();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await crmApi.getProfile();
      if (res.success && res.data?.user) {
        setBalance(res.data.user.creditsBalance);
      }
    } catch (e) {
      console.error('Failed to fetch profile info', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchListings() {
    setLoadingListings(true);
    try {
      const res = await crmApi.getListings({ 
        limit: 100,
        ownerId: user?.role !== 'ADMIN' ? user?.id : undefined
      });
      if (res.success && res.data) {
        // Only allow active or draft listings to be upgraded (not sold/rented)
        const items = res.data.items || [];
        setListings(items.filter(l => l.status === 'ACTIVE' || l.status === 'DRAFT'));
      }
    } catch (e) {
      console.error('Failed to load listings', e);
    } finally {
      setLoadingListings(false);
    }
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setCheckoutSubmitting(true);
    setCheckoutError(null);

    // Mock validation
    if (cardNumber.replace(/\s/g, '').length < 16 || cvv.length < 3 || !cardHolder || !expiry) {
      setCheckoutError('Please enter valid credit card details.');
      setCheckoutSubmitting(false);
      return;
    }

    try {
      const res = await crmApi.purchaseCredits(selectedPkg.credits);
      if (res.success && res.data) {
        setBalance(res.data.newBalance);
        setCheckoutSuccess(true);
        setTimeout(() => {
          setSelectedPkg(null);
          setCheckoutSuccess(false);
          setCardNumber('');
          setCardHolder('');
          setExpiry('');
          setCvv('');
        }, 2500);
      } else {
        setCheckoutError(res.message || 'Payment gateway connection error.');
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Payment gateway connection error.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleUpgradeListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListingId) {
      setUpgradeError('Please select a property to promote.');
      return;
    }

    const cost = selectedUpgradeDays === 30 ? 40 : 15;
    if (balance !== null && balance < cost) {
      setUpgradeError(`Insufficient credits. You need ${cost} credits but have only ${balance}.`);
      return;
    }

    setSubmittingUpgrade(true);
    setUpgradeError(null);
    setUpgradeSuccess(null);

    try {
      const res = await crmApi.featureListing(selectedListingId, selectedUpgradeDays);
      if (res.success) {
        setUpgradeSuccess(`Successfully upgraded listing to FEATURED for ${selectedUpgradeDays} days!`);
        // Deduct credits locally
        if (balance !== null) setBalance(balance - cost);
        setSelectedListingId('');
        // Reload listings status
        fetchListings();
      } else {
        setUpgradeError(res.message || 'Failed to apply upgrade.');
      }
    } catch (err: any) {
      setUpgradeError(err.message || 'An error occurred during upgrade.');
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <CrmTopBar title="Billing & Credit Store" subtitle="Manage your advertising currency, listing packages, and premium upgrades" />

      <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-5xl mx-auto w-full min-w-0">

        {/* Top Ledger Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Balance card */}
          <div className="bg-[#064e4b] text-white rounded-3xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between md:col-span-2 min-h-[160px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-[#a3cbc8] font-bold uppercase tracking-widest">Available Advertising Funds</p>
                <h3 className="text-4xl font-black mt-2 font-mono">
                  {loading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    `${balance?.toLocaleString() ?? 0} Credits`
                  )}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#a3cbc8]" />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-[#a3cbc8]">
              <span>1 listing publish cost = 10 credits (first limits are free)</span>
              <button onClick={fetchProfile} className="hover:text-white transition-colors flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          </div>

          {/* Quick Economics Info */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Economics breakdown</span>
              <h4 className="text-sm font-bold text-slate-800">Premium Promotions Pricing</h4>
            </div>

            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Standard Listing Publish:</span>
                <span className="font-bold text-slate-700">10 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>7-Day Featured Spot:</span>
                <span className="font-bold text-slate-700">15 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>30-Day Featured Spot:</span>
                <span className="font-bold text-slate-700">40 Credits</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-2">
              Featured listings are pinned to the top of searching results and receive up to 5x higher client engagement.
            </p>
          </div>
        </div>

        {/* Featured Listing Upgrade Cockpit */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900">Featured Listing Promotion Upgrades</h3>
          </div>

          {upgradeError && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{upgradeError}</span>
            </div>
          )}

          {upgradeSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{upgradeSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpgradeListing} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">Select Property Listing</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold outline-none text-slate-700 focus:border-[#064e4b] focus:bg-white"
                value={selectedListingId}
                onChange={(e) => setSelectedListingId(e.target.value)}
                disabled={loadingListings || listings.length === 0}
              >
                {loadingListings ? (
                  <option>Loading properties...</option>
                ) : listings.length === 0 ? (
                  <option>No active properties available to feature</option>
                ) : (
                  <>
                    <option value="">Select a listing...</option>
                    {listings.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.shortId || l.id.slice(0,8)} - {l.arTitle} ({l.isFeatured ? '★ Already Featured' : 'Unfeatured'})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">Featured Duration</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold outline-none text-slate-700 focus:border-[#064e4b] focus:bg-white"
                value={selectedUpgradeDays}
                onChange={(e) => setSelectedUpgradeDays(Number(e.target.value))}
              >
                <option value={7}>7 Days (15 Credits)</option>
                <option value={30}>30 Days (40 Credits)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submittingUpgrade || !selectedListingId}
              className="py-3 px-4 bg-[#064e4b] hover:bg-[#043a37] text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submittingUpgrade ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Apply Upgrade'}
            </button>
          </form>
        </div>

        {/* Credit Packages Store */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#064e4b]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Purchase Advertising Credits</h3>
              <p className="text-xs text-slate-400 mt-0.5">Top-up your wallet to continue listing properties and applying featured spot promotions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.key}
                className={clsx(
                  "bg-white border rounded-3xl p-6 flex flex-col justify-between relative transition-all duration-200 shadow-sm",
                  pkg.popular ? "border-2 border-[#064e4b] scale-[1.02] md:scale-100 lg:scale-[1.02]" : "border-slate-200 hover:shadow-md"
                )}
              >
                {pkg.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#064e4b] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                    Most Popular
                  </span>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 block">{pkg.name}</h4>
                    <span className="text-3xl font-black text-slate-900 font-mono mt-1 block">
                      {pkg.credits.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Credits Bundle</span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed min-h-[40px]">
                    {pkg.desc}
                  </p>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100 mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 font-mono">{pkg.price}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">SAR</span>
                  </div>

                  <button
                    onClick={() => {
                      setCheckoutError(null);
                      setCheckoutSuccess(false);
                      setSelectedPkg(pkg);
                    }}
                    className={clsx(
                      "w-full py-2.5 rounded-xl font-bold text-xs transition-colors",
                      pkg.popular 
                        ? "bg-[#064e4b] hover:bg-[#043a37] text-white" 
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                    )}
                  >
                    Select Package
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Payment slide-over / modal */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedPkg(null)} />
          
          <form 
            onSubmit={handleCheckoutSubmit}
            className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-in"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#064e4b] flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Secure Billing Checkout</h3>
                  <p className="text-[10px] text-slate-400">Powered by mock transaction service</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedPkg(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scroll Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Package Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Purchasing:</span>
                  <span className="text-sm font-bold text-slate-900">{selectedPkg.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-[#064e4b] block">+{selectedPkg.credits.toLocaleString()} Credits</span>
                  <span className="text-xs text-slate-700 font-bold font-mono">{selectedPkg.price} SAR</span>
                </div>
              </div>

              {checkoutSuccess ? (
                <div className="py-12 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Transaction Successful!</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedPkg.credits.toLocaleString()} credits have been added to your balance.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {checkoutError && (
                    <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Cardholder Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. ABDULLAH BIN FAHD"
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white transition-all rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none text-slate-900"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Card Number *</label>
                    <input
                      type="text"
                      placeholder="XXXX XXXX XXXX XXXX"
                      maxLength={19}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white transition-all rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none text-slate-900 font-mono"
                      value={cardNumber}
                      onChange={(e) => {
                        // Auto-format spacing for credit card
                        const val = e.target.value.replace(/\D/g, '');
                        const matches = val.match(/\d{4,16}/g);
                        const match = (matches && matches[0]) || '';
                        const parts = [];

                        for (let i = 0, len = match.length; i < len; i += 4) {
                          parts.push(match.substring(i, i + 4));
                        }

                        if (parts.length > 0) {
                          setCardNumber(parts.join(' '));
                        } else {
                          setCardNumber(val);
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase">Expiry Date *</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        required
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white transition-all rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none text-slate-900 font-mono"
                        value={expiry}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length >= 2) {
                            setExpiry(`${val.substring(0, 2)}/${val.substring(2, 4)}`);
                          } else {
                            setExpiry(val);
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase">CVV Security *</label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength={3}
                        required
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white transition-all rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none text-slate-900 font-mono"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-400 flex items-start gap-2 mt-4 leading-normal">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>This transaction is a secure simulation for development mode. No real charges are made to your card.</span>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            {!checkoutSuccess && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPkg(null)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkoutSubmitting}
                  className="flex-1 py-3 bg-[#064e4b] hover:bg-[#043a37] text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  {checkoutSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Payment'}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

    </div>
  );
}
