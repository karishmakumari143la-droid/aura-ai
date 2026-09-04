import React from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  Crown, 
  FolderKanban, 
  Clock, 
  AlertCircle,
  Cpu
} from 'lucide-react';
import { User, ProjectQuotaStatus } from '../types';

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
  quota
}) => {
  if (!isOpen) return null;

  const isOwner = user?.isOwner || user?.role === 'OWNER' || quota?.isOwner;
  const used = quota?.used ?? 2;
  const limit = quota?.limit ?? 5;
  const remaining = isOwner ? 999999 : Math.max(0, limit - used);
  const isLimitReached = !isOwner && used >= limit;

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
                <p className="text-xs text-amber-300 leading-relaxed">
                  Today's 5-project limit is reached. Your project allowance will reset tomorrow.
                </p>
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
        <div className="pt-4 border-t border-white/5 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20"
          >
            Acknowledge & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
