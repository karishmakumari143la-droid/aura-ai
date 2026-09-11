import React from 'react';
import { User, AuraState, ProjectQuotaStatus } from '../../types';
import { AuraLogo } from './AuraLogo';
import { 
  Sparkles, 
  Cpu, 
  Globe, 
  Brain, 
  Sliders, 
  ShieldCheck, 
  Mic, 
  MicOff, 
  Crown, 
  Layers,
  FolderKanban
} from 'lucide-react';

export type AuraTab = 'aura' | 'work' | 'world' | 'memory' | 'projects' | 'integrations' | 'settings' | 'owner';

interface AuraNavbarProps {
  user: User | null;
  activeTab: AuraTab;
  onSelectTab: (tab: AuraTab) => void;
  orbState: AuraState;
  onToggleVoice: () => void;
  onLogout: () => void;
  isVoiceActive: boolean;
  onOpenLanding?: () => void;
  quota?: ProjectQuotaStatus | null;
  onOpenAllowanceModal?: () => void;
}

export const AuraNavbar: React.FC<AuraNavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  orbState,
  onToggleVoice,
  onLogout,
  isVoiceActive,
  onOpenLanding,
  quota,
  onOpenAllowanceModal
}) => {
  const isOwner = user?.isOwner || user?.role === 'OWNER' || quota?.isOwner;

  const navItems = [
    { id: 'aura', label: 'AURA', icon: Sparkles },
    { id: 'work', label: 'WORK', icon: Cpu },
    { id: 'world', label: 'WORLD', icon: Layers },
    { id: 'memory', label: 'MEMORY', icon: Brain },
    { id: 'projects', label: 'PROJECTS', icon: Globe },
    { id: 'integrations', label: 'INTEGRATIONS', icon: ShieldCheck },
    { id: 'settings', label: 'SETTINGS', icon: Sliders }
  ];

  return (
    <header className="border-b border-white/[0.08] bg-[#02050B]/90 backdrop-blur-2xl sticky top-0 z-40 px-4 sm:px-6 h-14 flex items-center justify-between transition-all select-none">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSelectTab('aura')}
          className="flex items-center gap-2.5 focus:outline-none group text-left"
        >
          <AuraLogo size={34} compact />
        </button>

        {onOpenLanding && (
          <button
            type="button"
            onClick={onOpenLanding}
            className="hidden xl:inline-flex text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-900/80 border border-transparent hover:border-white/10 transition"
          >
            Landing
          </button>
        )}
      </div>

      {/* Center: Clean Navigation */}
      <nav className="hidden md:flex items-center gap-0.5 bg-slate-950/80 p-1 rounded-2xl border border-white/[0.08] shadow-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id as AuraTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Owner Tab if user is Owner */}
        {isOwner && (
          <button
            type="button"
            onClick={() => onSelectTab('owner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'owner'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                : 'text-purple-400 hover:text-purple-200 hover:bg-purple-950/40 border border-purple-800/40'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>OWNER</span>
          </button>
        )}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Daily Project Allowance Status Indicator (Quiet, Clean, Clear) */}
        <button
          type="button"
          onClick={onOpenAllowanceModal}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-xl bg-slate-950/90 border border-white/[0.08] hover:border-cyan-500/40 transition group text-left shadow-sm"
          title="Daily Project Allowance (Click to view details)"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isOwner ? 'bg-amber-400' : (quota && quota.used >= quota.limit) ? 'bg-amber-400' : 'bg-cyan-400'} group-hover:scale-125 transition-transform`} />
          <div className="flex items-center gap-1.5 font-mono text-[11px] leading-none">
            <span className="font-bold text-slate-400 tracking-wider">
              {isOwner ? 'OWNER' : 'FREE'}
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-cyan-300 font-semibold">
              {isOwner 
                ? 'UNLIMITED PROJECTS' 
                : `${quota ? quota.used : 2} / ${quota ? quota.limit : 5} PROJECTS TODAY`
              }
            </span>
          </div>
        </button>

        {/* Voice control reflects actual browser recognition state */}
        <button
          type="button"
          onClick={onToggleVoice}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
            isVoiceActive
              ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 shadow-sm shadow-teal-500/10'
              : 'bg-slate-950/80 border-white/[0.08] text-slate-400 hover:text-white'
          }`}
          title={isVoiceActive ? 'Voice Assistant Active (Click to mute)' : 'Enable Voice Assistant'}
        >
          {isVoiceActive ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
              </span>
              <Mic className="w-3.5 h-3.5 text-teal-300" />
              <span className="hidden sm:inline text-[11px]">Voice Active</span>
            </>
          ) : (
            <>
              <MicOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Voice Off</span>
            </>
          )}
        </button>

        {/* Authenticated user indicator */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-white/[0.08] px-2.5 py-1 rounded-xl text-xs">
          <span className={`w-1.5 h-1.5 rounded-full ${isOwner ? 'bg-amber-400' : 'bg-cyan-400'}`} />
          <span className="font-mono text-slate-300 text-[11px]">
            {isOwner ? 'OWNER' : 'FREE USER'}
          </span>
          <button type="button" onClick={onLogout} className="ml-1 text-[10px] font-mono text-slate-500 hover:text-rose-300" title="Sign out">Sign out</button>
        </div>
      </div>
    </header>
  );
};
