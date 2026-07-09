'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { CrmTopBar } from '@/components/CrmSidebar';
import { crmApi, CreditPackage, CreditOrder, CreditLedgerEntry } from '@/lib/api';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import {
  Wallet, CreditCard, CheckCircle, Clock, XCircle, RefreshCw,
  Loader2, Sparkles, TrendingUp, ArrowUpRight, ArrowDownLeft,
  ShoppingBag, Zap, ShieldCheck, ChevronRight, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';

// ── Moyasar JS is loaded dynamically to keep the publishable key server-gated ──
declare global {
  interface Window {
    Moyasar?: any;
  }
}

const ORDER_STATUS_CFG = {
  PENDING:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  PAID:     { label: 'Paid',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
  FAILED:   { label: 'Failed',   color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: RefreshCw },
} as const;

const LEDGER_TYPE_CFG = {
  CREDIT_PURCHASE: { label: 'Credit Purchase', icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  LISTING_PUBLISH: { label: 'Listing Published', icon: ArrowDownLeft, color: 'text-red-500', bg: 'bg-red-50' },
  LISTING_FEATURE: { label: 'Listing Featured', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
  LISTING_BUMP:    { label: 'Listing Bumped', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
  ADMIN_GRANT:     { label: 'Admin Grant', icon: ArrowUpRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  FIRM_GRANT:      { label: 'Firm Allocation', icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50' },
} as const;

type Tab = 'store' | 'promote' | 'orders' | 'ledger';

function StatusBadge({ status }: { status: keyof typeof ORDER_STATUS_CFG }) {
  const cfg = ORDER_STATUS_CFG[status] ?? ORDER_STATUS_CFG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border', cfg.color)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

// Checkout Modal with Moyasar embedded form
function CheckoutModal({
  pkg,
  onClose,
  onSuccess,
}: {
  pkg: CreditPackage;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}) {
  const [step, setStep] = useState<'init' | 'form' | 'success' | 'error'>('init');
  const [error, setError] = useState<string | null>(null);
  const [initData, setInitData] = useState<{ publishableKey: string; orderId: string; reference: string } | null>(null);
  const [newBalance, setNewBalance] = useState<number>(0);

  const checkoutStartedRef = useRef(false);
  const moyasarInitializedRef = useRef(false);
  // ref callback — fires only after React paints the div to the DOM
  const formContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (checkoutStartedRef.current) return;
    checkoutStartedRef.current = true;
    initCheckout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initCheckout() {
    setStep('init');
    setError(null);
    moyasarInitializedRef.current = false;
    formContainerRef.current = null;
    try {
      const res = await crmApi.initCheckout(pkg.key);
      if (!res.success || !res.data) {
        setError(res.message || 'Could not start payment. Please try again.');
        setStep('error');
        return;
      }
      const data = res.data as any;
      // Save orderId so the redirect handler can use it after 3DS page
      sessionStorage.setItem('tamleeq_pending_order_id', data.orderId);
      setInitData({ publishableKey: data.publishableKey, orderId: data.orderId, reference: data.reference });
      setStep('form');
    } catch (e: any) {
      setError(e.message || 'Unexpected error.');
      setStep('error');
    }
  }

  // Called by React when the container div enters or leaves the DOM
  function attachFormContainer(el: HTMLDivElement | null) {
    formContainerRef.current = el;
    if (el && initData && !moyasarInitializedRef.current) {
      mountMoyasarForm(initData.publishableKey, initData.orderId, pkg.priceSar, initData.reference);
    }
  }

  function mountMoyasarForm(publishableKey: string, orderId: string, amountSar: number, reference: string) {
    // Load Moyasar.js if not already loaded
    if (!document.getElementById('moyasar-js')) {
      const script = document.createElement('script');
      script.id = 'moyasar-js';
      script.src = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
      script.onload = () => doMount(publishableKey, orderId, amountSar, reference);
      document.head.appendChild(script);

      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';
      document.head.appendChild(css);
    } else {
      doMount(publishableKey, orderId, amountSar, reference);
    }
  }

  async function handleConfirmPayment(completedPaymentId: string, orderId: string) {
    try {
      const res = await crmApi.confirmPayment(completedPaymentId, orderId);
      if (res.success) {
        setNewBalance(res.data?.newBalance ?? 0);
        setStep('success');
        setTimeout(() => onSuccess(res.data?.newBalance ?? 0), 2500);
      } else {
        setError(res.message || 'Payment confirmation failed.');
        setStep('error');
      }
    } catch (e: any) {
      setError(e.message || 'Unexpected confirmation error.');
      setStep('error');
    }
  }

  function doMount(publishableKey: string, orderId: string, amountSar: number, reference: string) {
    if (!window.Moyasar) return;
    const el = formContainerRef.current || document.getElementById('moyasar-form-container');
    if (!el) return;
    if (moyasarInitializedRef.current) return;
    moyasarInitializedRef.current = true;

    // Clear container and pass the actual element (not string) to avoid querySelector race
    el.innerHTML = '';
    window.Moyasar.init({
      element: el,
      amount: amountSar * 100, // halalas
      currency: 'SAR',
      description: `Tamleeq — ${pkg.nameEn} (${pkg.credits.toLocaleString()} credits)`,
      publishable_api_key: publishableKey,
      callback_url: `${window.location.origin}${window.location.pathname}`, // clean URL — no stacking params
      methods: ['creditcard', 'mada'],
      metadata: { orderId, reference },
      on_completed: async (payment: any) => {
        await handleConfirmPayment(payment.id, orderId);
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0a3d35] to-[#064e4b] p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#a3cbc8]">Credit Purchase</p>
              <h2 className="text-xl font-black mt-1">{pkg.nameEn}</h2>
              <p className="text-sm text-[#a3cbc8] mt-0.5">{pkg.credits.toLocaleString()} credits · {pkg.priceSar.toLocaleString()} SAR</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white text-lg">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 'init' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-[#064e4b] animate-spin" />
              <p className="text-sm text-slate-500">Connecting to payment gateway…</p>
            </div>
          )}

          {step === 'form' && (
            <>
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Payments are secured by Moyasar. Card details never reach our servers.</span>
              </div>
              <div id="moyasar-form-container" ref={attachFormContainer} className="min-h-[280px]" />
            </>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center py-10 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Payment Successful!</h3>
              <p className="text-sm text-slate-500">
                <span className="font-bold text-slate-700">{pkg.credits.toLocaleString()} credits</span> have been added to your wallet.
              </p>
              {newBalance > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm">
                  New balance: <span className="font-black text-[#064e4b]">{newBalance.toLocaleString()} credits</span>
                </div>
              )}
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Payment Failed</h3>
              <p className="text-sm text-red-600 max-w-xs">{error}</p>
              <button
                onClick={initCheckout}
                className="h-9 px-5 bg-[#064e4b] text-white rounded-xl text-sm font-bold hover:bg-[#0a3d35] transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { user } = useCrmAuth();
  const [tab, setTab] = useState<Tab>('store');
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [orders, setOrders] = useState<CreditOrder[]>([]);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPkg, setCheckoutPkg] = useState<CreditPackage | null>(null);
  const [redirectResult, setRedirectResult] = useState<{ status: 'paid' | 'failed'; message: string } | null>(null);

  // Promote Property States
  const [listings, setListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState('');
  const [selectedUpgradeDays, setSelectedUpgradeDays] = useState<number>(7);
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadingListings(true);
    try {
      const [pkgRes, balRes, ordRes, ledRes, listRes] = await Promise.all([
        crmApi.getBillingPackages(),
        crmApi.getCreditBalance(),
        crmApi.getCreditOrders(),
        crmApi.getCreditLedger(),
        crmApi.getListings({
          limit: 100,
          ownerId: user?.role !== 'ADMIN' ? user?.id : undefined
        }),
      ]);
      if (pkgRes.success && pkgRes.data) setPackages(pkgRes.data as CreditPackage[]);
      if (balRes.success && balRes.data) setBalance((balRes.data as any).balance ?? 0);
      if (ordRes.success && ordRes.data) setOrders(ordRes.data as CreditOrder[]);
      if (ledRes.success && ledRes.data) setLedger(ledRes.data as CreditLedgerEntry[]);
      if (listRes.success && listRes.data) {
        const items = (listRes.data as any).items || [];
        setListings(items.filter((l: any) => l.status === 'ACTIVE' || l.status === 'DRAFT'));
      }
    } finally {
      setLoading(false);
      setLoadingListings(false);
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Handle Moyasar 3DS redirect — fires when page reloads with ?id=...&status=... in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('id');
    const status = params.get('status');
    if (!paymentId || !status) return;

    // Strip params from URL immediately so they don’t stack on next redirect
    window.history.replaceState({}, '', window.location.pathname);

    // Retrieve the orderId saved before the 3DS redirect
    const savedOrderId = sessionStorage.getItem('tamleeq_pending_order_id') ?? undefined;
    sessionStorage.removeItem('tamleeq_pending_order_id');

    if (status === 'paid') {
      setRedirectResult({ status: 'paid', message: 'Verifying payment…' });
      crmApi.confirmPayment(paymentId, savedOrderId).then((res) => {
        if (res.success && !(res as any).data?.alreadyProcessed) {
          setRedirectResult({ status: 'paid', message: 'Payment Successful! Your credit balance has been updated.' });
          loadAll();
        } else if (res.success) {
          // alreadyProcessed — webhook beat us to it, just refresh balance
          setRedirectResult({ status: 'paid', message: 'Payment Successful! Your credit balance has been updated.' });
          loadAll();
        } else {
          setRedirectResult({ status: 'failed', message: res.message || 'Payment verification failed.' });
        }
      }).catch(() => {
        setRedirectResult({ status: 'failed', message: 'Could not verify payment. Please contact support.' });
      });
    } else {
      setRedirectResult({ status: 'failed', message: 'Payment declined. Please try again with a different card.' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaymentSuccess = (newBalance: number) => {
    setBalance(newBalance);
    setCheckoutPkg(null);
    loadAll();
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
        if (balance !== null) setBalance(balance - cost);
        setSelectedListingId('');
        loadAll();
      } else {
        setUpgradeError(res.message || 'Failed to apply upgrade.');
      }
    } catch (err: any) {
      setUpgradeError(err.message || 'An error occurred during upgrade.');
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: typeof Wallet }[] = [
    { key: 'store',   label: 'Credit Store',     icon: ShoppingBag },
    { key: 'promote',  label: 'Promote Property', icon: Sparkles },
    { key: 'orders',  label: 'My Orders',        icon: CreditCard },
    { key: 'ledger',  label: 'Spend Ledger',     icon: TrendingUp },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <CrmTopBar title="Billing & Credits" subtitle="Purchase and manage your advertising credits" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-5 space-y-6 w-full">

          {/* ── Redirect Result Banner (shown after 3DS redirect) ── */}
          {redirectResult && (
            <div className={`rounded-2xl p-4 flex items-center gap-3 ${
              redirectResult.status === 'paid'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {redirectResult.status === 'paid'
                ? <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                : <XCircle className="w-5 h-5 shrink-0 text-red-500" />}
              <p className="text-sm font-medium flex-1">{redirectResult.message}</p>
              <button onClick={() => setRedirectResult(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>
          )}

          {/* ── Balance Hero Card ── */}
          <div className="bg-gradient-to-br from-[#0a3d35] to-[#064e4b] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-12 -mt-12" />
            <div className="absolute bottom-0 left-1/2 w-24 h-24 bg-white/5 rounded-full -mb-8" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#a3cbc8]">Available Credits</p>
                <div className="flex items-end gap-2 mt-2">
                  {loading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-[#a3cbc8]" />
                  ) : (
                    <>
                      <span className="text-4xl sm:text-5xl font-black font-mono">
                        {(balance ?? 0).toLocaleString()}
                      </span>
                      <span className="text-[#a3cbc8] pb-1 text-sm font-bold">credits</span>
                    </>
                  )}
                </div>
                <p className="text-[#a3cbc8] text-xs mt-2">Used for listing publish, feature, and promotions</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6 text-[#a3cbc8]" />
                </div>
                <button onClick={loadAll} className="h-9 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors">
                  <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Quick economics */}
            <div className="relative mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Publish Listing', cost: '10 cr' },
                { label: 'Feature 7 days', cost: '15 cr' },
                { label: 'Feature 30 days', cost: '40 cr' },
                { label: 'Bump Listing', cost: '5 cr' },
              ].map(item => (
                <div key={item.label} className="bg-white/5 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-[#a3cbc8] font-medium">{item.label}</div>
                  <div className="text-sm font-black text-white mt-0.5">{item.cost}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tab Nav ── */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-bold transition-all',
                    tab === t.key
                      ? 'bg-[#064e4b] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Credit Store Tab ── */}
          {tab === 'store' && (
            <div className="space-y-4">
              {loading && packages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#064e4b] animate-spin" />
                </div>
              ) : packages.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No credit packages available. Check back soon.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {packages.map(pkg => (
                    <div
                      key={pkg.id}
                      className={clsx(
                        'bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md',
                        pkg.isPopular ? 'border-[#064e4b] ring-1 ring-[#064e4b]/20' : 'border-slate-200'
                      )}
                    >
                      {pkg.isPopular && (
                        <div className="bg-[#064e4b] text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5">
                          ★ Most Popular
                        </div>
                      )}
                      <div className="p-5 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-black text-slate-800 text-base">{pkg.nameEn}</h3>
                            {pkg.descriptionEn && (
                              <p className="text-xs text-slate-500 mt-0.5">{pkg.descriptionEn}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="text-2xl font-black text-[#064e4b]">{pkg.priceSar.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">SAR</div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <div className="h-10 px-4 bg-[#064e4b]/5 rounded-xl flex items-center gap-2 flex-1">
                            <Sparkles className="w-4 h-4 text-[#064e4b]" />
                            <span className="text-sm font-black text-[#064e4b]">{pkg.credits.toLocaleString()} credits</span>
                          </div>
                          <div className="text-xs text-slate-400 shrink-0">
                            ≈ {(pkg.priceSar / pkg.credits).toFixed(2)} SAR/credit
                          </div>
                        </div>
                      </div>

                      <div className="px-5 pb-5">
                        <button
                          onClick={() => setCheckoutPkg(pkg)}
                          className={clsx(
                            'w-full h-11 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all border-2',
                            pkg.isPopular
                              ? 'bg-[#064e4b] border-[#064e4b] text-white hover:bg-[#0a3d35] hover:border-[#0a3d35]'
                              : 'bg-white border-[#064e4b] text-[#064e4b] hover:bg-[#064e4b] hover:text-white'
                          )}
                        >
                          <CreditCard className="w-4 h-4" />
                          Buy Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Security trust strip */}
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Payments powered by Moyasar · PCI DSS compliant · Card data never touches our servers</span>
              </div>
            </div>
          )}

          {/* ── Promote Property Tab ── */}
          {tab === 'promote' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 max-w-xl mx-auto w-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-[#064e4b]/10 text-[#064e4b] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Promote Property</h3>
                  <p className="text-xs text-slate-500">Feature your properties to place them at the top of search results</p>
                </div>
              </div>

              <form onSubmit={handleUpgradeListing} className="space-y-5">
                {upgradeError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold animate-fade-in">
                    {upgradeError}
                  </div>
                )}
                {upgradeSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 font-semibold animate-fade-in">
                    {upgradeSuccess}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Select Listing</label>
                  {loadingListings ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#064e4b]" />
                      <span>Loading active properties…</span>
                    </div>
                  ) : listings.length === 0 ? (
                    <div className="text-sm text-slate-400 italic py-2">
                      No active listings found to promote. Create or publish a listing first.
                    </div>
                  ) : (
                    <select
                      value={selectedListingId}
                      onChange={e => setSelectedListingId(e.target.value)}
                      className="w-full h-11 px-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-[#064e4b] text-slate-700"
                    >
                      <option value="">-- Choose one of your listings --</option>
                      {listings.map((l: any) => {
                        const isFeatured = l.isFeatured && l.featuredUntil && new Date(l.featuredUntil) > new Date();
                        const featuredLabel = isFeatured 
                          ? ` [FEATURED until ${new Date(l.featuredUntil).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}]` 
                          : '';
                        return (
                          <option key={l.id} value={l.id}>
                            {l.enTitle || l.arTitle} ({l.city} - {l.price.toLocaleString()} SAR){featuredLabel}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Promotion Plan</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { days: 7, cost: 15, desc: 'Weekly Boost' },
                      { days: 30, cost: 40, desc: 'Monthly Dominance' },
                    ].map(plan => (
                      <button
                        type="button"
                        key={plan.days}
                        onClick={() => setSelectedUpgradeDays(plan.days)}
                        className={clsx(
                          'p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5',
                          selectedUpgradeDays === plan.days
                            ? 'border-[#064e4b] bg-[#064e4b]/5 text-[#064e4b] ring-1 ring-[#064e4b]/20 font-bold'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <span className="text-xs uppercase tracking-wider font-bold opacity-60">{plan.desc}</span>
                        <span className="text-xl font-black">{plan.days} Days</span>
                        <span className="text-xs bg-[#064e4b]/10 text-[#064e4b] px-2.5 py-0.5 rounded-full font-black">
                          {plan.cost} credits
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingUpgrade || listings.length === 0 || !selectedListingId}
                    className="w-full h-11 rounded-2xl bg-[#064e4b] hover:bg-[#0a3d35] disabled:opacity-40 text-white text-sm font-black flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    {submittingUpgrade ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Promote Listing
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Orders Tab ── */}
          {tab === 'orders' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#064e4b] animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No orders yet. Purchase a credit package to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {orders.map(order => (
                    <div key={order.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{order.packageNameEn}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex gap-3 flex-wrap">
                          <span>{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          {order.moyasarPaymentId && (
                            <span className="font-mono opacity-50 truncate max-w-[120px]">{order.moyasarPaymentId}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <div className="text-center">
                          <div className="text-sm font-black text-[#064e4b]">{order.creditsAmount.toLocaleString()}</div>
                          <div className="text-[9px] font-bold uppercase text-slate-400">Credits</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-black text-slate-700">{order.priceSar.toLocaleString()}</div>
                          <div className="text-[9px] font-bold uppercase text-slate-400">SAR</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Spend Ledger Tab ── */}
          {tab === 'ledger' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#064e4b] animate-spin" />
                </div>
              ) : ledger.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No credit activity yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ledger.map(entry => {
                    const cfg = LEDGER_TYPE_CFG[entry.type] ?? LEDGER_TYPE_CFG.CREDIT_PURCHASE;
                    const Icon = cfg.icon;
                    const isDebit = entry.amount < 0;
                    return (
                      <div key={entry.id} className="p-4 sm:p-5 flex items-center gap-4">
                        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                          <Icon className={clsx('w-4 h-4', cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-800">{cfg.label}</div>
                          <div className="text-xs text-slate-400 mt-0.5 truncate">
                            {entry.description ?? '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(entry.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={clsx('text-base font-black', isDebit ? 'text-red-500' : 'text-emerald-600')}>
                            {isDebit ? '' : '+'}{entry.amount.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            bal: {entry.balanceAfter.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Checkout Modal ── */}
      {checkoutPkg && (
        <CheckoutModal
          pkg={checkoutPkg}
          onClose={() => setCheckoutPkg(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
