import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  Crown, 
  ShieldCheck, 
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { User } from '../types';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onPlanUpdated: (user: any) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  user,
  onPlanUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgradeToPro = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/subscriptions/upgrade', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Successfully upgraded to Pro!');
        if (data.user) {
          onPlanUpdated(data.user);
        }
      } else {
        setMessage(data.error || 'Failed to update plan');
      }
    } catch (err) {
      setMessage('Network error communicating with billing gateway.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl rounded-3xl bg-slate-950 border border-white/10 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 text-xs font-semibold border border-cyan-800">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Commercial SaaS Subscription</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Choose Your AI Operating Capacity
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Scale your business with 21 autonomous specialist agents and server-side Gemini intelligence.
          </p>
        </div>

        {/* Owner Banner if owner */}
        {user?.isOwner && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-300">Owner Unlimited Master License Active</p>
              <p className="text-[11px] text-amber-400/80">
                You are logged in as the system owner ({user.email}). All autonomous capabilities, server tiers, and token throughput are unlocked with zero billing.
              </p>
            </div>
          </div>
        )}

        {message && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 text-center">
            {message}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FREE */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-300">Free Tier</h3>
              <p className="text-3xl font-extrabold text-white mt-2">$0</p>
              <p className="text-xs text-slate-400 mt-1">Explore single agent tests and workspace review.</p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> 1 Agent at a time</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Read-only projects</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Community support</li>
              </ul>
            </div>
            <div className="pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-500">Current Plan</span>
            </div>
          </div>

          {/* PRO ($20/mo) - Highlighted */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-cyan-500/60 shadow-xl shadow-cyan-500/10 space-y-4 flex flex-col justify-between relative scale-105">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-extrabold text-[10px] uppercase">
              Recommended Commercial
            </div>
            <div>
              <h3 className="text-base font-bold text-white">PRO Commercial</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$20</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">Full 21 autonomous specialist agents and instant tools.</p>
              <ul className="mt-4 space-y-2 text-xs text-slate-200">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> All 21 Specialist Agents</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Unlimited Website Projects</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp & CRM Lead Integrations</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> n8n & REST Workflow Automation</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> GitHub Sync & Automated QA</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Persistent AI Memory Base</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleUpgradeToPro}
                disabled={loading || user?.subscriptionPlan === 'PRO' || user?.isOwner}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>
                  {user?.isOwner ? 'Included with Owner Access' :
                   user?.subscriptionPlan === 'PRO' ? 'Active Pro Subscription' :
                   loading ? 'Activating...' : 'Upgrade to Pro ($20/mo)'}
                </span>
              </button>
            </div>
          </div>

          {/* ENTERPRISE */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-300">Enterprise</h3>
              <p className="text-3xl font-extrabold text-white mt-2">Custom</p>
              <p className="text-xs text-slate-400 mt-1">Dedicated private cloud nodes, SLA guarantees & on-prem.</p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Custom Agent Model Fine-Tunes</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Zero Data Retention SLA</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-cyan-400" /> Dedicated 24/7 Security Desk</li>
              </ul>
            </div>
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
