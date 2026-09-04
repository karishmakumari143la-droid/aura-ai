import React from 'react';
import { User, AuraState } from '../../types';
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
  ExternalLink,
  Layers,
  Check
} from 'lucide-react';

export type AuraTab = 'aura' | 'work' | 'world' | 'memory' | 'projects' | 'integrations' | 'settings' | 'owner';

interface AuraNavbarProps {
  user: User | null;
  activeTab: AuraTab;
  onSelectTab: (tab: AuraTab) => void;
  orbState: AuraState;
  onToggleVoice: () => void;
  isVoiceActive: boolean;
  onSwitchRole: (role: 'OWNER' | 'FREE_USER') => void;
  onOpenLanding?: () => void;
}

export const AuraNavbar: React.FC<AuraNavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  orbState,
  onToggleVoice,
  isVoiceActive,
  onSwitchRole,
  onOpenLanding
}) => {
  const isOwner = user?.isOwner || user?.role === 'OWNER';

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
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl sticky top-0 z-40 px-4 sm:px-6 py-2.5 flex items-center justify-between">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSelectTab('aura')}
          className="flex items-center gap-2.5 focus:outline-none group text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="text-cyan-400 font-extrabold text-xs tracking-tighter">AI</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-wider text-white">AURA</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                LIVING AI
              </span>
            </div>
          </div>
        </button>

        {onOpenLanding && (
          <button
            type="button"
            onClick={onOpenLanding}
            className="hidden lg:inline-flex text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-900 border border-transparent hover:border-white/10 transition"
          >
            Landing Overview
          </button>
        )}
      </div>

      {/* Center Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-2xl border border-white/5">
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
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Owner Tab - Only if user is Owner */}
        {isOwner && (
          <button
            type="button"
            onClick={() => onSelectTab('owner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'owner'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 font-bold'
                : 'text-purple-400 hover:text-purple-200 hover:bg-purple-950/40 border border-purple-800/40'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>OWNER</span>
          </button>
        )}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Voice Recognition Quick Toggle */}
        <button
          type="button"
          onClick={onToggleVoice}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
            isVoiceActive
              ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 shadow-sm'
              : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'
          }`}
          title={isVoiceActive ? 'Voice Assistant Active' : 'Enable Voice Assistant'}
        >
          {isVoiceActive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <Mic className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Voice Active</span>
            </>
          ) : (
            <>
              <MicOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice Off</span>
            </>
          )}
        </button>

        {/* Free User / Role Badge */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/10 px-2.5 py-1 rounded-xl text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-mono text-slate-300 text-[11px]">
            {isOwner ? 'OWNER (ROOT)' : 'ALL USERS FREE'}
          </span>
          <button
            type="button"
            onClick={() => onSwitchRole(isOwner ? 'FREE_USER' : 'OWNER')}
            className="text-[10px] text-cyan-400 hover:underline ml-1 font-mono"
            title="Toggle user role for preview testing"
          >
            [{isOwner ? 'Simulate Free' : 'Enable Owner'}]
          </button>
        </div>
      </div>
    </header>
  );
};
