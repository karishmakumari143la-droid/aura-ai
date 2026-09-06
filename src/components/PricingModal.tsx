import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  Crown, 
  FolderKanban, 
  Clock, 
  AlertCircle,
  Cpu,
  QrCode,
  Copy,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { User, ProjectQuotaStatus, UPIOrder, UPIConfig } from '../types';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onPlanUpdated?: (user: any) => void;
  quota?: ProjectQuotaStatus | null;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  user,
  onPlanUpdated,
  quota
}) => {
  const [activeTab, setActiveTab] = useState<'free' | 'upi'>('free');
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string; amount: number }>({
    id: 'PRO_MONTHLY',
    name: 'AURA AI Pro Access (Unlimited Projects)',
    amount: 499
  });
  const [upiConfig, setUpiConfig] = useState<UPIConfig | null>(null);
  const [currentOrder, setCurrentOrder] = useState<UPIOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrError, setUtrError] = useState<string | null>(null);
  const [utrSuccessMsg, setUtrSuccessMsg] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load UPI configuration
      fetch('/api/upi/config')
        .then(res => res.json())
        .then(data => {
          if (data.config) setUpiConfig(data.config);
        })
        .catch(err => console.error('[UPI] Error fetching config:', err));

      // Fetch any existing active order for current user
      if (user) {
        fetch('/api/upi/orders')
          .then(res => res.json())
          .then(data => {
            if (data.orders && data.orders.length > 0) {
              // Find the most recent active or pending order
              const recent = data.orders[0];
              setCurrentOrder(recent);
              if (recent.customerUtr) {
                setUtrInput(recent.customerUtr);
              }
            }
          })
          .catch(err => console.error('[UPI] Error fetching user orders:', err));
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const isOwner = user?.isOwner || user?.role === 'OWNER' || quota?.isOwner;
  const used = quota?.used ?? 2;
  const limit = quota?.limit ?? 5;
  const remaining = isOwner ? 999999 : Math.max(0, limit - used);
  const isLimitReached = !isOwner && used >= limit;
  const payeeVpa = upiConfig?.upiId || '9818691915@pytes';

  const handleCreateOrder = async () => {
    if (!user) {
      alert('Please sign in or register to initiate an upgrade order.');
      return;
    }

    setLoadingOrder(true);
    setUtrError(null);
    setUtrSuccessMsg(null);

    try {
      const res = await fetch('/api/upi/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.amount
        })
      });

      const data = await res.json();
      if (res.ok && data.order) {
        setCurrentOrder(data.order);
        setUtrInput('');
      } else {
        setUtrError(data.error || 'Failed to initialize UPI payment intent');
      }
    } catch (err: any) {
      setUtrError(err?.message || 'Network error while contacting server');
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleSubmitUTR = async () => {
    if (!currentOrder) return;
    const clean = utrInput.trim().replace(/\s+/g, '');
    if (!clean) {
      setUtrError('Please enter your 12-digit UPI UTR / Transaction Reference number.');
      return;
    }

    if (!/^\d{12}$/.test(clean)) {
      setUtrError('Invalid UTR format. Bank reference must be exactly 12 numeric digits.');
      return;
    }

    setSubmittingUtr(true);
    setUtrError(null);
    setUtrSuccessMsg(null);

    try {
      const res = await fetch(`/api/upi/orders/${currentOrder.orderId}/submit-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr: clean })
      });

      const data = await res.json();
      if (res.ok && data.order) {
        setCurrentOrder(data.order);
        setUtrSuccessMsg('UTR recorded. Order status is now PENDING_VERIFICATION. Waiting for bank statement reconciliation.');
      } else {
        setUtrError(data.error || 'Failed to submit UTR');
      }
    } catch (err: any) {
      setUtrError(err?.message || 'Error submitting UTR');
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!currentOrder) return;
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/upi/orders/${currentOrder.orderId}`);
      const data = await res.json();
      if (res.ok && data.order) {
        setCurrentOrder(data.order);
        if (data.order.status === 'VERIFIED') {
          setUtrSuccessMsg('Payment confirmed and verified! Your Pro access is active.');
          if (onPlanUpdated && user) {
            onPlanUpdated({
              ...user,
              subscriptionPlan: 'PRO',
              subscriptionStatus: 'active'
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyVpaToClipboard = () => {
    navigator.clipboard.writeText(payeeVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-950 border border-white/10 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 mb-6 max-w-xs mx-auto p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('free')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'free' 
                ? 'bg-cyan-500 text-slate-950 shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Free Plan Quota
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upi')}
            className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 transition ${
              activeTab === 'upi' 
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Pay via UPI</span>
          </button>
        </div>

        {/* TAB 1: FREE ACCESS MODEL (Preserved strictly as original) */}
        {activeTab === 'free' && (
          <div>
            {/* Header */}
            <div className="text-center max-w-xl mx-auto space-y-2 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 text-xs font-semibold border border-cyan-800">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>AURA AI Access Model</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                100% Free For All Creators
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                No payments, subscriptions, or credit cards required. Everyone receives full access to autonomous specialist agents.
              </p>
            </div>

            {/* Quota Usage Highlight Card */}
            <div className={`p-5 rounded-2xl border mb-6 ${
              isLimitReached 
                ? 'bg-amber-950/25 border-amber-500/30' 
                : isOwner 
                ? 'bg-purple-950/25 border-purple-500/30' 
                : 'bg-slate-900/80 border-cyan-500/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {isOwner ? 'Master Owner License' : 'Daily Project Allowance'}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/50 border border-white/10 text-cyan-300">
                  Resets at Midnight (00:00 UTC)
                </span>
              </div>

              {isOwner ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Crown className="w-4 h-4" />
                    <span>Unlimited Projects & System Bandwidth</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    You are authenticated as the system owner. You have zero daily project caps or resource limits.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-white font-mono">
                      {used} <span className="text-sm font-normal text-slate-400">/ {limit} projects used today</span>
                    </span>
                    <span className={`text-sm font-mono font-bold ${isLimitReached ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isLimitReached ? 'Limit reached' : `${remaining} remaining today`}
                    </span>
                  </div>

                  {/* Segmented bar */}
                  <div className="grid grid-cols-5 gap-1.5 py-1">
                    {Array.from({ length: limit }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-full transition-all ${
                          i < used 
                            ? 'bg-cyan-500 shadow-sm shadow-cyan-500/50' 
                            : 'bg-slate-800 border border-white/5'
                        }`}
                      />
                    ))}
                  </div>

                  {isLimitReached ? (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-300 leading-relaxed">
                        Today's 5-project limit is reached. Your project allowance will reset tomorrow at midnight UTC.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('upi')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/30 transition"
                      >
                        <span>Upgrade to Unlimited via Direct UPI (₹499/mo)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300">
                      You can create <strong className="text-cyan-300">{remaining} more new project{remaining === 1 ? '' : 's'}</strong> today.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Key Model Principles */}
            <div className="space-y-3 mb-6">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                How The Access Model Works
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold">
                    <FolderKanban className="w-4 h-4" />
                    <span>5 New Projects / Day</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Every user can initiate up to 5 full new website or business projects every 24-hour cycle.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Cpu className="w-4 h-4" />
                    <span>Unlimited Tasks Per Project</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Once a project exists, run endless tasks, edits, SEO audits, and agent workflows with zero cost.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-400 font-bold">
                    <Clock className="w-4 h-4" />
                    <span>Automatic Daily Reset</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Counters reset automatically at midnight UTC so you always start every new day fresh.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Zero Paywalls & Zero Cards</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    No checkout pages, credit card forms, or hidden upgrades. Everything is built to empower you.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
              >
                <span>Optional Pro Upgrade via UPI</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20"
              >
                Acknowledge & Continue
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: DIRECT UPI PAYMENT (Zero Gateways, Verified Bank Verification) */}
        {activeTab === 'upi' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="text-center max-w-xl mx-auto space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Payment Gateway — Direct UPI P2P</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                Direct UPI Payment
              </h2>
              <p className="text-xs text-slate-400">
                Payments settle directly to the owner's UPI ID. Zero gateway surcharges, no credit card forms, 100% verified.
              </p>
            </div>

            {/* VPA Highlight Banner */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Receiver UPI ID (VPA)
                </span>
                <div className="text-base sm:text-lg font-mono font-bold text-emerald-300 select-all">
                  {payeeVpa}
                </div>
                <p className="text-[11px] text-slate-400">
                  Configured on server via <code className="text-cyan-300 font-mono">UPI_ID</code>
                </p>
              </div>

              <button
                type="button"
                onClick={copyVpaToClipboard}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copiedVpa ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy UPI ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Plan Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Select Option:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  onClick={() => {
                    setSelectedPlan({
                      id: 'PRO_MONTHLY',
                      name: 'AURA AI Pro Access (Unlimited Projects)',
                      amount: 499
                    });
                    setCurrentOrder(null);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    selectedPlan.id === 'PRO_MONTHLY'
                      ? 'bg-emerald-950/30 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900/50 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Pro Unlimited Plan</span>
                    <span className="text-sm font-mono font-extrabold text-emerald-400">₹499</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Unlimited daily projects, priority neural AI compute, autonomous GitHub commits.
                  </p>
                </div>

                <div 
                  onClick={() => {
                    setSelectedPlan({
                      id: 'SUPPORTER',
                      name: 'Platform Creator Contribution',
                      amount: 199
                    });
                    setCurrentOrder(null);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    selectedPlan.id === 'SUPPORTER'
                      ? 'bg-emerald-950/30 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900/50 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Creator Supporter Tip</span>
                    <span className="text-sm font-mono font-extrabold text-cyan-400">₹199</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Direct contribution to server operations and open-access intelligence.
                  </p>
                </div>
              </div>
            </div>

            {/* Order Generator / Display */}
            {!currentOrder ? (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 text-center space-y-3">
                <p className="text-xs text-slate-300">
                  Ready to pay <strong>₹{selectedPlan.amount}</strong> directly to <strong>{payeeVpa}</strong>?
                </p>
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={loadingOrder}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {loadingOrder ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <QrCode className="w-3.5 h-3.5" />
                  )}
                  <span>Generate UPI QR Code & Deep Link</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* QR Code & Deep Link Section */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 flex flex-col sm:flex-row items-center gap-5">
                  {/* Real QR Code Display */}
                  <div className="p-2.5 bg-white rounded-2xl shadow-xl flex-shrink-0">
                    <img 
                      src={currentOrder.qrDataUrl} 
                      alt="UPI QR Code" 
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                    />
                    <div className="mt-1 text-center text-[10px] font-mono text-slate-600">
                      Scan with any UPI App
                    </div>
                  </div>

                  {/* Deep Link & App Actions */}
                  <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        Order #{currentOrder.orderId.slice(-8)}
                      </span>
                      <h4 className="text-base font-bold text-white mt-1">
                        Amount: <span className="text-emerald-400 font-mono text-xl">₹{currentOrder.amount}</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        {currentOrder.planName}
                      </p>
                    </div>

                    {/* Mobile Pay via UPI Deep Link */}
                    <div>
                      <a
                        href={currentOrder.upiUri}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm transition shadow-lg shadow-emerald-500/20"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Pay via UPI (Open App)</span>
                      </a>
                      <p className="text-[10px] text-slate-400 mt-1 text-center">
                        Supports Google Pay, PhonePe, Paytm, BHIM, CRED, Navi & Banks
                      </p>
                    </div>

                    {/* Raw UPI Deep Link reference */}
                    <div className="p-2 rounded-lg bg-slate-950 border border-white/5 text-[10px] font-mono text-slate-400 break-all">
                      URI: {currentOrder.upiUri.slice(0, 50)}...
                    </div>
                  </div>
                </div>

                {/* CRITICAL VERIFICATION DISCLAIMER (Strict adherence to requirement) */}
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Real Verification Required — No Fake Auto-Success</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Opening or clicking the UPI link does <strong>NOT</strong> automatically mark payment as successful. Direct UPI payments credit directly to the owner's bank account. After completing the payment in your UPI app, copy the <strong>12-digit UPI Reference Number / UTR</strong> and submit it below to reconcile.
                  </p>
                </div>

                {/* UTR Submission Box */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Step 2: Submit 12-Digit Bank UTR / Reference</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      Standard Indian Bank Format
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      maxLength={12}
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 423589123456 (12 digits)"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleSubmitUTR}
                      disabled={submittingUtr || utrInput.length !== 12}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow disabled:opacity-40 whitespace-nowrap"
                    >
                      {submittingUtr ? 'Submitting...' : 'Submit UTR for Verification'}
                    </button>
                  </div>

                  {utrError && (
                    <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <span>{utrError}</span>
                    </div>
                  )}

                  {utrSuccessMsg && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{utrSuccessMsg}</span>
                    </div>
                  )}
                </div>

                {/* Current Order Verification Status Card */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Reconciliation Status
                    </span>
                    <div className="flex items-center gap-2">
                      {currentOrder.status === 'CREATED' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          Awaiting Payment & UTR
                        </span>
                      )}
                      {currentOrder.status === 'PENDING_VERIFICATION' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-amber-950 text-amber-300 border border-amber-800">
                          ⏳ Pending Bank Reconciliation (UTR: {currentOrder.customerUtr})
                        </span>
                      )}
                      {currentOrder.status === 'VERIFIED' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                          ✓ VERIFIED & ACTIVE
                        </span>
                      )}
                      {currentOrder.status === 'REJECTED' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-red-950 text-red-300 border border-red-800">
                          ✗ REJECTED: {currentOrder.rejectionReason}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRefreshStatus}
                      disabled={checkingStatus}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className={`w-3 h-3 ${checkingStatus ? 'animate-spin' : ''}`} />
                      <span>Check Status</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentOrder(null)}
                      className="text-xs text-slate-500 hover:text-slate-300 underline"
                    >
                      New Order
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('free')}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Back to Free Allowance
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
