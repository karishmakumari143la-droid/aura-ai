import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectQuotaStatus, User } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  FolderKanban, 
  Sparkles, 
  Layers, 
  Info, 
  X, 
  AlertCircle,
  ShieldCheck,
  Crown,
  RefreshCw
} from 'lucide-react';

interface ProjectAllowanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota: ProjectQuotaStatus | null;
  user: User | null;
  onRefreshQuota?: () => void;
  onSimulateLimit?: () => void;
  onResetQuota?: () => void;
}

export const ProjectAllowanceModal: React.FC<ProjectAllowanceModalProps> = ({
  isOpen,
  onClose,
  quota,
  user,
  onRefreshQuota,
  onSimulateLimit,
  onResetQuota
}) => {
  if (!isOpen) return null;

  const isOwner = user?.isOwner || user?.role === 'OWNER' || quota?.isOwner;
  const used = quota?.used ?? 2;
  const limit = quota?.limit ?? 5;
  const remaining = isOwner ? 999999 : Math.max(0, limit - used);
  const isLimitReached = !isOwner && used >= limit;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Top Bar Accent */}
          <div className={`h-1.5 w-full ${isLimitReached ? 'bg-amber-500' : isOwner ? 'bg-gradient-to-r from-purple-500 to-amber-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} />

          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${
                isOwner ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400' :
                isLimitReached ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' :
                'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
              }`}>
                {isOwner ? <Crown className="w-5 h-5" /> : <FolderKanban className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Daily Project Allowance</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                    100% FREE
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  AURA AI provides completely free access for all creators.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-white/10 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5">
            {/* Status Card */}
            <div className={`p-4 rounded-2xl border ${
              isLimitReached 
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' 
                : isOwner 
                ? 'bg-purple-950/20 border-purple-500/30 text-purple-200' 
                : 'bg-slate-900/60 border-white/10 text-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {isOwner ? 'Owner Tier Privilege' : "Today's Usage Counter"}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 text-cyan-300">
                  Resets: Midnight (00:00 UTC)
                </span>
              </div>

              {isOwner ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Crown className="w-4 h-4" />
                    <span>Unlimited Project Generation Unlocked</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    As an authenticated Owner, you are exempt from daily limits. You have unlimited edits, design changes, and automation workflows inside existing projects.
                  </p>
                </div>
              ) : isLimitReached ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>Today's 5-project limit is reached</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Your project allowance will reset tomorrow. All of your existing projects remain fully active with unlimited messages, edits, and automated tasks!
                  </p>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-amber-500/40">
                    <div className="bg-amber-500 h-full w-full rounded-full" />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>5 / 5 projects used today</span>
                    <span className="text-amber-400 font-bold">0 remaining today</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-white font-mono">
                      {used} <span className="text-sm font-normal text-slate-400">/ {limit} used today</span>
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      {remaining} project{remaining === 1 ? '' : 's'} remaining
                    </span>
                  </div>

                  {/* Segmented Progress Bar (5 slots) */}
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

                  <p className="text-xs text-slate-300">
                    You can create <strong className="text-cyan-300">{remaining} more new project{remaining === 1 ? '' : 's'}</strong> today.
                  </p>
                </div>
              )}
            </div>

            {/* Crucial Rule Explanation */}
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/30 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Projects vs. Individual Tasks</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The 5-project limit applies <strong className="text-white">only to creating new projects</strong>. Once a project is created, you can perform <strong className="text-white">unlimited tasks</strong>, design updates, SEO enhancements, and voice commands inside that project with zero count against your allowance!
              </p>
            </div>

            {/* Free Architecture Highlights */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/50 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>No Subscriptions</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Every user is 100% free with no credit card required.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/50 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Daily Auto-Reset</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Counter automatically refreshes every calendar day at 00:00 UTC.
                </p>
              </div>
            </div>

            {/* Interactive Preview Testing Tools */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Developer Testing Controls:
                </span>
                {onRefreshQuota && (
                  <button
                    type="button"
                    onClick={onRefreshQuota}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Sync
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                
                {onResetQuota && (
                  <button
                    type="button"
                    onClick={onResetQuota}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/80 text-[11px] font-mono transition"
                  >
                    [Reset Usage to 0/5]
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-900/40 border-t border-white/5 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
