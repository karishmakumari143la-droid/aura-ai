import React from 'react';
import {
  X,
  CheckCircle2,
  FolderKanban,
  Clock,
  ShieldCheck,
  Sparkles,
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
  quota,
}) => {
  if (!isOpen) return null;

  const isOwner = user?.isOwner || user?.role === 'OWNER' || quota?.isOwner;
  const used = quota?.used ?? 0;
  const limit = quota?.limit ?? 5;
  const remaining = isOwner ? limit : Math.max(0, limit - used);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#080b12] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="border-b border-white/10 px-6 py-7 sm:px-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <Sparkles className="text-cyan-300" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AURA AI Access</h2>
              <p className="text-sm text-white/45">Full AURA capability access</p>
            </div>
          </div>

          <p className="max-w-xl text-sm leading-6 text-white/60">
            AURA AI is free for everyone. There are no subscriptions,
            upgrades, payment gates, or credit-card requirements.
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-5">
            <div className="mb-4 flex items-center gap-3">
              <FolderKanban size={20} className="text-cyan-300" />
              <h3 className="font-semibold text-white">New Projects</h3>
            </div>

            <div className="mb-2 text-3xl font-bold text-white">
              {isOwner ? 'Unlimited' : `${remaining} left`}
            </div>

            <p className="text-sm leading-5 text-white/50">
              {isOwner
                ? 'Owner access is unlimited.'
                : `${used} of ${limit} new projects used today.`}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="mb-4 flex items-center gap-3">
              <Clock size={20} className="text-violet-300" />
              <h3 className="font-semibold text-white">Existing Projects</h3>
            </div>

            <div className="mb-2 text-3xl font-bold text-white">Unlimited</div>

            <p className="text-sm leading-5 text-white/50">
              Continue chatting, editing, improving, testing and working on
              your existing projects.
            </p>
          </div>
        </div>

        <div className="mx-6 mb-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5 sm:mx-8 sm:mb-8">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-300" />
            <h3 className="font-semibold text-white">What you get</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              'Natural conversation with AURA',
              'Website and code work',
              'Files and project workflows',
              'Browser and verification capabilities',
              'Memory and project context',
              'Automation when configured',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-white/65">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-white/10 px-6 py-5 sm:px-8">
          <button
            onClick={onClose}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Continue with AURA
          </button>
        </div>
      </div>
    </div>
  );
};
